/**
 * Sprawdzenie drogi z formularza do bazy: `FormData` w takim zapisie, w jakim
 * przychodzi z przeglądarki, przez walidację Zod aż do wiersza w Neonie.
 * Uruchamiane ręcznie, nie zostawia po sobie danych.
 */
import {
  createInvoice,
  deleteInvoice,
  findDuplicateInvoice,
  getInvoice,
} from "@/lib/db/queries";
import {
  invoiceFieldErrors,
  invoiceFormSchema,
  readInvoiceFormValues,
} from "@/lib/invoice-schema";

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

function checkValidation() {
  const parsed = invoiceFormSchema.safeParse(readInvoiceFormValues(form(FILLED)));
  if (!parsed.success) {
    failures.push(`Poprawny formularz odrzucony: ${parsed.error.message}`);
    return;
  }

  check("numer bez spacji na końcach", parsed.data.invoiceNumber, "TEST-FORM/0350/2026");
  check("brutto z symbolem waluty i przecinkiem", parsed.data.grossAmount, "750.00");
  check("NIP bez kresek", parsed.data.sellerNip, "8241167409");
  check("netto z przecinkiem", parsed.data.netAmount, "609.76");
  check("cena dla mnie z przecinkiem", parsed.data.costAmount, "700.00");

  const empty = invoiceFormSchema.safeParse(
    readInvoiceFormValues(form({ netAmount: "", vatAmount: "", costAmount: "" })),
  );
  check("pusty formularz odrzucony", empty.success, false);
  if (!empty.success) {
    const errors = invoiceFieldErrors(empty.error);
    check("brak numeru zgłoszony", errors.invoiceNumber, "Podaj numer faktury.");
    check("brak daty zgłoszony", errors.issueDate, "Podaj datę wystawienia.");
    check("brak brutto zgłoszony", errors.grossAmount, "Podaj wartość brutto.");
    check("puste netto bez błędu", errors.netAmount, undefined);
    check("pusta cena dla mnie bez błędu", errors.costAmount, undefined);
  }

  const bad = invoiceFormSchema.safeParse(
    readInvoiceFormValues(form({ ...FILLED, grossAmount: "mniej więcej tysiąc" })),
  );
  check("nieczytelna kwota odrzucona", bad.success, false);

  const badDate = invoiceFormSchema.safeParse(
    readInvoiceFormValues(form({ ...FILLED, issueDate: "2026-02-30" })),
  );
  check("nieistniejąca data odrzucona", badDate.success, false);

  const badNip = invoiceFormSchema.safeParse(
    readInvoiceFormValues(form({ ...FILLED, buyerNip: "824172" })),
  );
  check("za krótki NIP odrzucony", badNip.success, false);

  console.log();
}

async function main() {
  loadLocalEnv();

  checkValidation();

  const parsed = invoiceFormSchema.safeParse(readInvoiceFormValues(form(FILLED)));
  if (!parsed.success) return;

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
