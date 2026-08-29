/**
 * Sprawdzenie warstwy bazy: zapisuje testową fakturę, odczytuje ją, porównuje
 * kwoty co do grosza i usuwa. Uruchamiane ręcznie (`npm run db:check`),
 * nie zostawia po sobie danych.
 */
import {
  createInvoice,
  deleteInvoice,
  findDuplicateInvoice,
  getInvoice,
  getSettings,
  listInvoices,
} from "@/lib/db/queries";
import { calculateFee } from "@/lib/fees";
import {
  formatCurrency,
  formatRate,
  parseAmount,
  sumAmounts,
} from "@/lib/money";

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
  check("prowizja 2,5% z 1234,56", calculateFee("1234.56", "2.50"), "30.86");
  check("prowizja 0% ", calculateFee("750.00", "0"), "0.00");
  console.log();
}

async function main() {
  loadLocalEnv();

  checkAmountParsing();

  const { feeRate } = await getSettings();
  console.log(`Stawka prowizji z ustawień: ${formatRate(feeRate)}\n`);

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
    feeRate: "5",
  });

  const read = await getInvoice(created.id);
  if (read === null) {
    failures.push("Zapisanej faktury nie da się odczytać.");
    return;
  }

  check("brutto wraca z bazy", read.grossAmount, "750.00");
  check("netto wraca z bazy", read.netAmount, "609.76");
  check("VAT wraca z bazy", read.vatAmount, "140.24");
  check("stawka zapisana z fakturą", read.feeRate, "5.00");
  check("prowizja wyliczona", read.feeAmount, calculateFee("750.00", "5.00"));
  check("prowizja z 750,00 przy 5%", read.feeAmount, "37.50");
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

  console.log(`\nProwizja do wyświetlenia: ${formatCurrency(read.feeAmount)}`);

  const removed = await deleteInvoice(read.id);
  check("faktura usunięta", removed?.id, read.id);
  check("po usunięciu nie ma jej w bazie", await getInvoice(read.id), null);
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
