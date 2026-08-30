/**
 * Wspólny kontrakt formularza faktury: te same typy widzi komponent w przeglądarce
 * i akcja na serwerze. Plik celowo nie ma dyrektywy `use server` — stan początkowy
 * i typy muszą dać się zaimportować po stronie klienta.
 */
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms/form-state";

/** Wartości tak, jak stoją w polach formularza: zawsze stringi, puste zamiast `null`. */
export type InvoiceFormValues = {
  invoiceNumber: string;
  issueDate: string;
  sellerName: string;
  sellerNip: string;
  /** Id z bazy, gdy skan albo lista rozpoznały sprzedawcę; puste znaczy nowy. */
  sellerContractorId: string;
  buyerName: string;
  buyerNip: string;
  buyerContractorId: string;
  recipientName: string;
  recipientNip: string;
  recipientContractorId: string;
  grossAmount: string;
  netAmount: string;
  vatAmount: string;
  /** Wpisywana ręcznie — na fakturze jej nie ma, więc AI jej nie odczytuje. */
  costAmount: string;
};

export type InvoiceFieldName = keyof InvoiceFormValues;

export const INVOICE_FIELD_NAMES: readonly InvoiceFieldName[] = [
  "invoiceNumber",
  "issueDate",
  "sellerName",
  "sellerNip",
  "sellerContractorId",
  "buyerName",
  "buyerNip",
  "buyerContractorId",
  "recipientName",
  "recipientNip",
  "recipientContractorId",
  "grossAmount",
  "netAmount",
  "vatAmount",
  "costAmount",
];

export const EMPTY_INVOICE_FORM_VALUES: InvoiceFormValues = {
  invoiceNumber: "",
  issueDate: "",
  sellerName: "",
  sellerNip: "",
  sellerContractorId: "",
  buyerName: "",
  buyerNip: "",
  buyerContractorId: "",
  recipientName: "",
  recipientNip: "",
  recipientContractorId: "",
  grossAmount: "",
  netAmount: "",
  vatAmount: "",
  costAmount: "",
};

/** Pola wymagane do zapisu — reszta może zostać pusta. */
export const REQUIRED_INVOICE_FIELDS: readonly InvoiceFieldName[] = [
  "invoiceNumber",
  "issueDate",
  "sellerName",
  "buyerName",
  "grossAmount",
];

/** Przy ręcznym wpisie zamiast nabywcy wymagamy odbiorcy. */
export function requiredInvoiceFields(options: {
  manual?: boolean;
} = {}): readonly InvoiceFieldName[] {
  if (!options.manual) return REQUIRED_INVOICE_FIELDS;
  return [
    "invoiceNumber",
    "issueDate",
    "sellerName",
    "recipientName",
    "grossAmount",
  ];
}

/**
 * Poza stanami wspólnymi dla wszystkich formularzy faktura ma jeszcze
 * `duplicate`: taka faktura już jest w bazie, a zapis czeka na potwierdzenie.
 */
export type InvoiceFormState = FormState<InvoiceFieldName, "duplicate"> & {
  invoiceId: number | null;
};

export const INITIAL_INVOICE_FORM_STATE: InvoiceFormState = {
  ...IDLE_FORM_STATE,
  invoiceId: null,
};

/** Nazwy pól ukrytych, po których akcja poznaje kontekst zapisu. */
export const INVOICE_ID_FIELD = "invoiceId";
export const IMAGE_PATHNAME_FIELD = "imagePathname";
export const DUPLICATE_CONFIRM_FIELD = "duplicateConfirmed";
export const DUPLICATE_CONFIRMED_VALUE = "1";

/** Dane od AI albo z bazy w postaci, jakiej oczekują pola formularza. */
export function toInvoiceFormValues(
  source: Partial<Record<InvoiceFieldName, string | null>> | null | undefined,
): InvoiceFormValues {
  const values = { ...EMPTY_INVOICE_FORM_VALUES };
  if (!source) return values;

  for (const name of INVOICE_FIELD_NAMES) {
    const value = source[name];
    if (typeof value === "string") values[name] = value.trim();
  }
  return values;
}

/**
 * Pola, których AI nie odczytała. Formularz oznacza je jako wymagające uwagi —
 * puste pole łatwo przeoczyć przy zatwierdzaniu, a wtedy faktura wpada do bazy
 * bez nabywcy albo bez daty. „Cena dla mnie" jest tu wyjątkiem: nie stoi na
 * fakturze, więc jej pustka nie jest niczyim przeoczeniem.
 */
const HIDDEN_INVOICE_FIELDS: ReadonlySet<InvoiceFieldName> = new Set([
  "costAmount",
  "sellerContractorId",
  "buyerContractorId",
  "recipientContractorId",
]);

export function emptyInvoiceFields(
  values: InvoiceFormValues,
): InvoiceFieldName[] {
  return INVOICE_FIELD_NAMES.filter(
    (name) => !HIDDEN_INVOICE_FIELDS.has(name) && values[name].length === 0,
  );
}
