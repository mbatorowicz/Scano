/**
 * Sprawdzenie warstwy bazy: zapisuje testową fakturę, odczytuje ją, porównuje
 * kwoty co do grosza i usuwa. Uruchamiane ręcznie (`npm run db:check`),
 * nie zostawia po sobie danych.
 *
 * Samo parsowanie kwot i wyliczanie należności sprawdza `npm test` — tutaj
 * chodzi wyłącznie o to, co robi z nimi prawdziwa baza.
 */
import {
  ContractorInUseError,
  deleteContractor,
  resolveContractor,
  resolveRecipient,
} from "@/lib/contractors/service";
import {
  findDuplicateInvoice,
  getInvoice,
  listInvoices,
} from "@/lib/invoices/repository";
import { createInvoice, deleteInvoice } from "@/lib/invoices/service";
import { formatCurrency, sumAmounts } from "@/lib/money";
import { getBalance } from "@/lib/settlements/repository";
import {
  createSettlement,
  deleteSettlement,
} from "@/lib/settlements/service";

import { loadLocalEnv } from "./env";

const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const passed = actual === expected;
  if (!passed) failures.push(`${label}: jest ${actual}, powinno być ${expected}`);
  console.log(`${passed ? "OK  " : "BŁĄD"} ${label}: ${actual}`);
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

  // Kwoty z prawdziwej faktury 0350/2026, na której będzie testowany odczyt AI.
  const seller = await resolveContractor({
    name: 'P.H.U. "Pecet" Mariusz Szczęsny',
    nip: "824-116-74-09",
  });
  const buyer = await resolveContractor({
    name: "Gmina Miedzna",
    nip: "8241723514",
  });
  const recipient = await resolveRecipient({
    name: "GOPS Miedzna",
    nip: "5250000039",
  });
  if (recipient === null) {
    failures.push("Nie udało się zapisać odbiorcy.");
    return;
  }

  const created = await createInvoice({
    invoiceNumber: "TEST/0350/2026",
    issueDate: "2026-08-12",
    sellerId: seller.id,
    buyerId: buyer.id,
    recipientId: recipient.id,
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
  check("odbiorca zapisany", read.recipientName, "GOPS Miedzna");

  const sameSeller = await resolveContractor({
    name: 'p.h.u. "pecet" mariusz szczęsny',
    nip: "8241167409",
  });
  check("ten sam sprzedawca rozpoznany po NIP-ie", sameSeller.id, seller.id);

  const duplicate = await findDuplicateInvoice("TEST/0350/2026", seller.id);
  check("duplikat rozpoznany po numerze i sprzedawcy", duplicate?.id, read.id);

  const found = await listInvoices({ search: "GOPS", from: "2026-08-01", to: "2026-08-31" });
  check(
    "faktura widoczna przez filtr daty i szukanie",
    found.some((row) => row.id === read.id),
    true,
  );

  console.log(`\nNależność do wyświetlenia: ${formatCurrency(read.payoutAmount)}`);

  const removed = await deleteInvoice(read.id);
  check("faktura usunięta", removed?.id, read.id);
  check("po usunięciu nie ma jej w bazie", await getInvoice(read.id), null);

  for (const party of [seller, buyer, recipient]) {
    try {
      await deleteContractor(party.id);
    } catch (cause) {
      if (!(cause instanceof ContractorInUseError)) throw cause;
    }
  }

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
