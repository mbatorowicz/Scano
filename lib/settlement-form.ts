/**
 * Wspólny kontrakt formularza wypłaty: te same typy widzi komponent w przeglądarce
 * i akcja na serwerze. Plik celowo nie ma dyrektywy `use server` — stan początkowy
 * i typy muszą dać się zaimportować po stronie klienta.
 */

/** Wartości tak, jak stoją w polach formularza: zawsze stringi, puste zamiast `null`. */
export type SettlementFormValues = {
  settledOn: string;
  amount: string;
  note: string;
};

export type SettlementFieldName = keyof SettlementFormValues;

export const SETTLEMENT_FIELD_NAMES: readonly SettlementFieldName[] = [
  "settledOn",
  "amount",
  "note",
];

export type SettlementFormStatus =
  | "idle"
  /** Walidacja nie przeszła — szczegóły w `fieldErrors`. */
  | "invalid"
  | "error"
  | "saved";

export type SettlementFormState = {
  status: SettlementFormStatus;
  message: string | null;
  fieldErrors: Partial<Record<SettlementFieldName, string>>;
};

export const INITIAL_SETTLEMENT_FORM_STATE: SettlementFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

/** Nazwa ukrytego pola, po którym akcja poznaje usuwaną wypłatę. */
export const SETTLEMENT_ID_FIELD = "settlementId";

/** Kwoty rozliczane najczęściej — jedno dotknięcie zamiast wklepywania na telefonie. */
export const QUICK_AMOUNTS = ["700", "1000", "1300", "1500"] as const;
