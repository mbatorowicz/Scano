/**
 * Sprawdzenie drogi z formularza do bazy: `FormData` w takim zapisie, w jakim
 * przychodzi z przeglądarki, przez walidację Zod aż do wiersza w Neonie.
 * Uruchamiane ręcznie, nie zostawia po sobie danych.
 *
 * Samą walidację, bez bazy, sprawdza `npm test` — tutaj chodzi o to, czy
 * przepuszczone przez nią dane trafiają do Neona w takiej postaci, jakiej
 * oczekują listy i eksport.
 */
import { findDuplicateInvoice, getInvoice } from "@/lib/invoices/repository";
import {
  invoiceFormSchema,
  readInvoiceFormValues,
} from "@/lib/invoices/schema";
import { createInvoice, deleteInvoice } from "@/lib/invoices/service";

import { loadLocalEnv } from "./env";

const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const passed = actual === expected;
  if (!passed) failures.push(`${label}: jest ${actual}, powinno być ${expected}`);
  console.log(`${passed ? "OK  " : "BŁĄD"} ${label}: ${actual}`);
}

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.append(name, value);
  return formData;
}

const FILLED = {
  invoiceNumber: " TEST-FORM/0350/2026 ",
  issueDate: "2026-08-12",
  sellerName: ' F.H.U. "Pecet" Mariusz Szczęsny ',
  sellerNip: "824-116-74-09",
  buyerName: "Gmina Miedzna",
  buyerNip: "8241723514",
  grossAmount: "750,00 zł",
  netAmount: "609,76",
  vatAmount: "140,24",
  costAmount: "700,00",
};

async function main() {
  loadLocalEnv();

  const parsed = invoiceFormSchema.safeParse(readInvoiceFormValues(form(FILLED)));
  if (!parsed.success) {
    failures.push(`Poprawny formularz odrzucony: ${parsed.error.message}`);
    return;
  }

  const created = await createInvoice({
    ...parsed.data,
    imagePathname: "faktury/2026-08/faktura-test.jpg",
  });

  const read = await getInvoice(created.id);
  check("faktura z formularza wylądowała w bazie", read?.grossAmount, "750.00");
  check("cena dla mnie zapisana", read?.costAmount, "700.00");
  check("należność policzona przy zapisie", read?.payoutAmount, "34.16");
  check("ścieżka zdjęcia zapisana", read?.imagePathname, "faktury/2026-08/faktura-test.jpg");

  const duplicate = await findDuplicateInvoice(
    parsed.data.invoiceNumber,
    parsed.data.sellerName,
  );
  check("ten sam skan rozpoznany jako duplikat", duplicate?.id, created.id);
  check(
    "przy edycji własny wiersz nie jest duplikatem",
    await findDuplicateInvoice(
      parsed.data.invoiceNumber,
      parsed.data.sellerName,
      created.id,
    ),
    null,
  );

  check("sprzątanie", (await deleteInvoice(created.id))?.id, created.id);
}

main()
  .then(() => {
    if (failures.length > 0) {
      console.error(`\n${failures.length} błąd(y):`);
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exit(1);
    }
    console.log("\nDroga z formularza do bazy działa poprawnie.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
