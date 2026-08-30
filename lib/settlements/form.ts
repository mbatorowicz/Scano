/**
 * Wspólny kontrakt formularza wypłaty: te same typy widzi komponent w przeglądarce
 * i akcja na serwerze. Plik celowo nie ma dyrektywy `use server` — stan początkowy
 * i typy muszą dać się zaimportować po stronie klienta.
 */
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms/form-state";

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

export const EMPTY_SETTLEMENT_FORM_VALUES: SettlementFormValues = {
  settledOn: "",
  amount: "",
  note: "",
};

export type SettlementFormState = FormState<SettlementFieldName>;

export const INITIAL_SETTLEMENT_FORM_STATE: SettlementFormState =
  IDLE_FORM_STATE;

/** Nazwa ukrytego pola, po którym akcja poznaje edytowaną albo usuwaną wypłatę. */
export const SETTLEMENT_ID_FIELD = "settlementId";

/** Wiersz z bazy w postaci, jakiej oczekują pola formularza. */
export function toSettlementFormValues(
  source: Partial<Record<SettlementFieldName, string | null>> | null | undefined,
): SettlementFormValues {
  const values = { ...EMPTY_SETTLEMENT_FORM_VALUES };
  if (!source) return values;

  for (const name of SETTLEMENT_FIELD_NAMES) {
    const value = source[name];
    if (typeof value === "string") values[name] = value.trim();
  }
  return values;
}
