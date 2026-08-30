/**
 * Wspólny kontrakt formularza faktury: te same typy widzi komponent w przeglądarce
 * i akcja na serwerze. Plik celowo nie ma dyrektywy `use server` — stan początkowy
 * i typy muszą dać się zaimportować po stronie klienta.
 */

/** Wartości tak, jak stoją w polach formularza: zawsze stringi, puste zamiast `null`. */
export type InvoiceFormValues = {
  invoiceNumber: string;
  issueDate: string;
  sellerName: string;
  sellerNip: string;
  buyerName: string;
  buyerNip: string;
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
  "buyerName",
  "buyerNip",
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
  buyerName: "",
  buyerNip: "",
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

export type InvoiceFormStatus =
  | "idle"
  /** Walidacja nie przeszła — szczegóły w `fieldErrors`. */
  | "invalid"
  /** Taka faktura już jest w bazie; zapis czeka na potwierdzenie. */
  | "duplicate"
  | "error"
  | "saved";

export type InvoiceFormState = {
  status: InvoiceFormStatus;
  message: string | null;
  fieldErrors: Partial<Record<InvoiceFieldName, string>>;
  invoiceId: number | null;
};

export const INITIAL_INVOICE_FORM_STATE: InvoiceFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  invoiceId: null,
};

/** Nazwy pól ukrytych, po których akcja poznaje kontekst zapisu. */
export const INVOICE_ID_FIELD = "invoiceId";
export const IMAGE_PATHNAME_FIELD = "imagePathname";
export const DUPLICATE_CONFIRM_FIELD = "duplicateConfirmed";
export const DUPLICATE_CONFIRMED_VALUE = "tak";

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
export function emptyInvoiceFields(
  values: InvoiceFormValues,
): InvoiceFieldName[] {
  return INVOICE_FIELD_NAMES.filter(
    (name) => name !== "costAmount" && values[name].length === 0,
  );
}
