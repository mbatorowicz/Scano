/**
 * Układ formularza faktury: jakie pola, w jakiej kolejności i pod jakim
 * podpisem. To opis danych, nie kod widoku — komponent tylko go przechodzi.
 */
import type { InvoiceFieldName } from "./form";

export type InvoiceFieldConfig = {
  name: InvoiceFieldName;
  label: string;
  type?: "text" | "date";
  inputMode?: "text" | "numeric" | "decimal";
  placeholder?: string;
  /** Pole zajmuje obie kolumny również na szerokim ekranie. */
  wide?: boolean;
  /**
   * Nazwa i NIP kontrahenta: podpowiedzi ze słownika oraz informacja,
   * czy firma jest już w bazie.
   */
  kind?: "contractor";
  nipField?: InvoiceFieldName;
  idField?: InvoiceFieldName;
};

export type InvoiceFormSection = {
  title: string;
  fields: readonly InvoiceFieldConfig[];
};

export const INVOICE_FORM_SECTIONS: readonly InvoiceFormSection[] = [
  {
    title: "Dokument",
    fields: [
      { name: "invoiceNumber", label: "Numer faktury", placeholder: "0350/2026" },
      { name: "issueDate", label: "Data wystawienia", type: "date" },
    ],
  },
  {
    title: "Strony",
    // Nabywca pierwszy: to on rozróżnia faktury. Sprzedawca jest zawsze Pecet.
    fields: [
      {
        name: "buyerName",
        label: "Nabywca",
        wide: true,
        kind: "contractor",
        nipField: "buyerNip",
        idField: "buyerContractorId",
      },
      {
        name: "buyerNip",
        label: "NIP nabywcy",
        inputMode: "numeric",
        placeholder: "opcjonalnie",
      },
      {
        name: "sellerName",
        label: "Sprzedawca",
        wide: true,
        kind: "contractor",
        nipField: "sellerNip",
        idField: "sellerContractorId",
      },
      {
        name: "sellerNip",
        label: "NIP sprzedawcy",
        inputMode: "numeric",
        placeholder: "opcjonalnie",
      },
    ],
  },
  {
    title: "Kwoty",
    fields: [
      {
        name: "grossAmount",
        label: "Wartość brutto",
        inputMode: "decimal",
        placeholder: "1234,56",
        wide: true,
      },
      { name: "netAmount", label: "Netto", inputMode: "decimal", placeholder: "opcjonalnie" },
      { name: "vatAmount", label: "VAT", inputMode: "decimal", placeholder: "opcjonalnie" },
      {
        name: "costAmount",
        label: "Cena dla mnie",
        inputMode: "decimal",
        placeholder: "0,00",
        wide: true,
      },
    ],
  },
];
