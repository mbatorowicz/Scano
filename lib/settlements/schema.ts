import { z } from "zod";

import { isIsoDate } from "@/lib/dates";
import { readFormValues } from "@/lib/forms/form-state";
import { parseAmount, toMinorUnits } from "@/lib/money";

import {
  SETTLEMENT_FIELD_NAMES,
  type SettlementFormValues,
} from "./form";

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

export function readSettlementFormValues(
  formData: FormData,
): SettlementFormValues {
  return readFormValues(formData, SETTLEMENT_FIELD_NAMES);
}
