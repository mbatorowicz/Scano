/**
 * Sprawdzenie warstwy bazy: zapisuje testową fakturę, odczytuje ją, porównuje
 * kwoty co do grosza i usuwa. Uruchamiane ręcznie (`npm run db:check`),
 * nie zostawia po sobie danych.
 */
import {
  createInvoice,
  createSettlement,
  deleteInvoice,
  deleteSettlement,
  findDuplicateInvoice,
  getBalance,
  getInvoice,
  listInvoices,
} from "@/lib/db/queries";
import { formatCurrency, parseAmount, sumAmounts } from "@/lib/money";
import { calculatePayout } from "@/lib/payout";

import { loadLocalEnv } from "./env";

const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const passed = actual === expected;
  if (!passed) failures.push(`${label}: jest ${actual}, powinno być ${expected}`);
  console.log(`${passed ? "OK  " : "BŁĄD"} ${label}: ${actual}`);
}

/** Kwoty przychodzą od Gemini i z formularza w różnych zapisach — to najbardziej kruchy kawałek. */
function checkAmountParsing() {
  check("750,00", parseAmount("750,00"), "750.00");
  check("1 234,56 ze spacją", parseAmount("1 234,56"), "1234.56");
  check("1.234,56 z kropką tysięcy", parseAmount("1.234,56"), "1234.56");
  check("1 234,56 zł", parseAmount("1 234,56 zł"), "1234.56");
  check("750.00 w zapisie AI", parseAmount("750.00"), "750.00");
  check("1.234 to tysiące", parseAmount("1.234"), "1234.00");
  check("zaokrąglenie groszy w górę", parseAmount("10,005"), "10.01");
  check("kwota bez części dziesiętnej", parseAmount("750"), "750.00");
  check("tekst nie jest kwotą", parseAmount("brak danych"), null);
  check("pusty tekst", parseAmount(""), null);
  check("suma nie gubi groszy", sumAmounts(["0.01", "0.02", "750.00"]), "750.03");
  console.log();
}

/** Kwoty z arkusza, który aplikacja ma zastąpić — muszą wyjść co do grosza. */
function checkPayout() {
  check("750,00 przy cenie 700,00", calculatePayout("750.00", "700.00"), "34.16");
  check("1107,00 bez własnego kosztu", calculatePayout("1107.00", "0.00"), "756.30");
  check("735,00 przy cenie 635,00", calculatePayout("735.00", "635.00"), "68.32");
  check("330,00 przy cenie 290,00", calculatePayout("330.00", "290.00"), "27.33");
  check("1640,00 przy cenie 1550,00", calculatePayout("1640.00", "1550.00"), "61.49");
  check("puste pole liczy się jak zero", calculatePayout("1107.00", ""), "756.30");
  check("cena wyższa niż brutto to strata", calculatePayout("700.00", "750.00"), "-34.16");
  console.log();
}

/**
 * Saldo: wypłata ma zbić należność dokładnie o swoją kwotę i oddać ją z powrotem
 * po usunięciu. Liczy je baza, więc sprawdzamy to na prawdziwym wierszu.
 */
async function checkBalance() {
  const before = await getBalance();

  const settlement = await createSettlement({
    settledOn: "2026-08-12",
    amount: "1 000,00",
    note: "wpis kontrolny",
  });

  check("kwota wypłaty zapisana", settlement.amount, "1000.00");

  const after = await getBalance();
  check("wypłata nie rusza zarobionego", after.earned, before.earned);
  check(
    "wypłata powiększa wypłacone",
    after.paid,
    sumAmounts([before.paid, "1000.00"]),
  );
  check(
    "saldo maleje o kwotę wypłaty",
    after.outstanding,
    sumAmounts([before.outstanding, "-1000.00"]),
  );

  const removed = await deleteSettlement(settlement.id);
  check("wypłata usunięta", removed?.id, settlement.id);
  check(
    "saldo wraca po usunięciu wypłaty",
    (await getBalance()).outstanding,
    before.outstanding,
  );
}

async function main() {
  loadLocalEnv();

  checkAmountParsing();
  checkPayout();

  // Kwoty z prawdziwej faktury 0350/2026, na której będzie testowany odczyt AI.
  const created = await createInvoice({
    invoiceNumber: "TEST/0350/2026",
    issueDate: "2026-08-12",
    sellerName: 'P.H.U. "Pecet" Mariusz Szczęsny',
    sellerNip: "824-116-74-09",
    buyerName: "Gmina Miedzna",
    buyerNip: "8241723514",
    grossAmount: "750,00",
    netAmount: "609,76",
    vatAmount: "140,24",
    costAmount: "700,00",
  });

  const read = await getInvoice(created.id);
  if (read === null) {
    failures.push("Zapisanej faktury nie da się odczytać.");
    return;
  }

  check("brutto wraca z bazy", read.grossAmount, "750.00");
  check("netto wraca z bazy", read.netAmount, "609.76");
  check("VAT wraca z bazy", read.vatAmount, "140.24");
  check("cena dla mnie zapisana z fakturą", read.costAmount, "700.00");
  check("należność wyliczona przy zapisie", read.payoutAmount, "34.16");
  check("data wystawienia", read.issueDate, "2026-08-12");
  check("NIP bez kresek", read.sellerNip, "8241167409");

  const duplicate = await findDuplicateInvoice(
    "TEST/0350/2026",
    'p.h.u. "pecet" mariusz szczęsny',
  );
  check("duplikat rozpoznany bez względu na wielkość liter", duplicate?.id, read.id);

  const found = await listInvoices({ search: "Miedzna", from: "2026-08-01", to: "2026-08-31" });
  check(
    "faktura widoczna przez filtr daty i szukanie",
    found.some((row) => row.id === read.id),
    true,
  );

  console.log(`\nNależność do wyświetlenia: ${formatCurrency(read.payoutAmount)}`);

  const removed = await deleteInvoice(read.id);
  check("faktura usunięta", removed?.id, read.id);
  check("po usunięciu nie ma jej w bazie", await getInvoice(read.id), null);

  console.log();
  await checkBalance();
}

main()
  .then(() => {
    if (failures.length > 0) {
      console.error(`\n${failures.length} błąd(y):`);
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exit(1);
    }
    console.log("\nWarstwa bazy działa poprawnie.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
