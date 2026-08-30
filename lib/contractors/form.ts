/**
 * Wspólny kontrakt formularza kontrahenta: te same typy widzi komponent
 * w przeglądarce i akcja na serwerze. Plik celowo nie ma dyrektywy `use server`.
 */
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms/form-state";

/** Wartości tak, jak stoją w polach formularza: zawsze stringi, puste zamiast `null`. */
export type ContractorFormValues = {
  name: string;
  nip: string;
};

export type ContractorFieldName = keyof ContractorFormValues;

export const CONTRACTOR_FIELD_NAMES: readonly ContractorFieldName[] = [
  "name",
  "nip",
];

export const EMPTY_CONTRACTOR_FORM_VALUES: ContractorFormValues = {
  name: "",
  nip: "",
};

export type ContractorFormState = FormState<ContractorFieldName>;

export const INITIAL_CONTRACTOR_FORM_STATE: ContractorFormState =
  IDLE_FORM_STATE;

/** Nazwa ukrytego pola, po którym akcja poznaje edytowaną albo usuwaną firmę. */
export const CONTRACTOR_ID_FIELD = "contractorId";

/** Wiersz z bazy albo z listy podpowiedzi — to, czego potrzebuje formularz faktury. */
export type ContractorOption = {
  id: number;
  name: string;
  nip: string | null;
};

export function toContractorFormValues(
  source: Partial<Record<ContractorFieldName, string | null>> | null | undefined,
): ContractorFormValues {
  const values = { ...EMPTY_CONTRACTOR_FORM_VALUES };
  if (!source) return values;

  for (const name of CONTRACTOR_FIELD_NAMES) {
    const value = source[name];
    if (typeof value === "string") values[name] = value.trim();
  }
  return values;
}
