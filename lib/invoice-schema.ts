import { z } from "zod";

import { isIsoDate } from "@/lib/dates";
import {
  INVOICE_FIELD_NAMES,
  type InvoiceFieldName,
  type InvoiceFormValues,
} from "@/lib/invoice-form";
import { parseAmount } from "@/lib/money";

const AMOUNT_MESSAGE = "Nie rozumiem tej kwoty. Wpisz ją tak: 1234,56.";

function text(max: number, message: string) {
  return z.string().min(1, message).max(max, "Ta wartość jest za długa.");
}

/** Pusto zostawiamy jako `null`; kwota nieczytelna to błąd, a nie zero w bazie. */
const optionalAmount = z
  .string()
  .refine((value) => value === "" || parseAmount(value) !== null, AMOUNT_MESSAGE)
  .transform((value) => (value === "" ? null : parseAmount(value)));

const requiredAmount = z
  .string()
  .min(1, "Podaj wartość brutto.")
  .refine((value) => parseAmount(value) !== null, AMOUNT_MESSAGE)
  .transform((value) => parseAmount(value) as string);

/** NIP zapisujemy jako same cyfry — wpisany z kreskami i bez ma być tym samym numerem. */
const nip = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(
    (digits) => digits.length === 0 || digits.length === 10,
    "NIP składa się z dziesięciu cyfr.",
  )
  .transform((digits) => (digits.length === 0 ? null : digits));

export const invoiceFormSchema = z.object({
  invoiceNumber: text(64, "Podaj numer faktury."),
  issueDate: z
    .string()
    .min(1, "Podaj datę wystawienia.")
    .refine(isIsoDate, "Ta data nie wygląda poprawnie."),
  sellerName: text(200, "Podaj nazwę sprzedawcy."),
  sellerNip: nip,
  buyerName: text(200, "Podaj nazwę nabywcy."),
  buyerNip: nip,
  grossAmount: requiredAmount,
  netAmount: optionalAmount,
  vatAmount: optionalAmount,
  costAmount: optionalAmount,
});

export type ParsedInvoiceForm = z.output<typeof invoiceFormSchema>;

/** Surowe wartości z `FormData`, przycięte i uzupełnione o brakujące pola. */
export function readInvoiceFormValues(formData: FormData): InvoiceFormValues {
  const values = {} as InvoiceFormValues;
  for (const name of INVOICE_FIELD_NAMES) {
    const value = formData.get(name);
    values[name] = typeof value === "string" ? value.trim() : "";
  }
  return values;
}

/** Pierwszy błąd na pole — przy jednym polu więcej niż jeden i tak nie pomaga. */
export function invoiceFieldErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): Partial<Record<InvoiceFieldName, string>> {
  const errors: Partial<Record<InvoiceFieldName, string>> = {};
  for (const issue of error.issues) {
    const name = issue.path[0];
    if (typeof name === "string" && !(name in errors)) {
      errors[name as InvoiceFieldName] = issue.message;
    }
  }
  return errors;
}
