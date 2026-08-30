import { z } from "zod";

import { isIsoDate } from "@/lib/dates";
import { parseAmount, toMinorUnits } from "@/lib/money";
import {
  SETTLEMENT_FIELD_NAMES,
  type SettlementFieldName,
  type SettlementFormValues,
} from "@/lib/settlement-form";

const AMOUNT_MESSAGE = "Nie rozumiem tej kwoty. Wpisz ją tak: 1000,00.";

export const settlementFormSchema = z.object({
  settledOn: z
    .string()
    .min(1, "Podaj datę wypłaty.")
    .refine(isIsoDate, "Ta data nie wygląda poprawnie."),
  amount: z
    .string()
    .min(1, "Podaj kwotę wypłaty.")
    .refine((value) => parseAmount(value) !== null, AMOUNT_MESSAGE)
    .transform((value) => parseAmount(value) as string)
    // Wypłata na zero albo na minus nie zmieniłaby salda, a zaśmieciłaby listę.
    .refine(
      (value) => (toMinorUnits(value) ?? 0n) > 0n,
      "Kwota wypłaty musi być większa od zera.",
    ),
  note: z
    .string()
    .max(200, "Ta notatka jest za długa.")
    .transform((value) => (value === "" ? null : value)),
});

export type ParsedSettlementForm = z.output<typeof settlementFormSchema>;

/** Surowe wartości z `FormData`, przycięte i uzupełnione o brakujące pola. */
export function readSettlementFormValues(
  formData: FormData,
): SettlementFormValues {
  const values = {} as SettlementFormValues;
  for (const name of SETTLEMENT_FIELD_NAMES) {
    const value = formData.get(name);
    values[name] = typeof value === "string" ? value.trim() : "";
  }
  return values;
}

/** Pierwszy błąd na pole — przy jednym polu więcej niż jeden i tak nie pomaga. */
export function settlementFieldErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): Partial<Record<SettlementFieldName, string>> {
  const errors: Partial<Record<SettlementFieldName, string>> = {};
  for (const issue of error.issues) {
    const name = issue.path[0];
    if (typeof name === "string" && !(name in errors)) {
      errors[name as SettlementFieldName] = issue.message;
    }
  }
  return errors;
}
