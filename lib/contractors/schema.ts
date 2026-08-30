import { z } from "zod";

import { readFormValues } from "@/lib/forms/form-state";
import { NIP_LENGTH, nipDigits } from "@/lib/nip";

import {
  CONTRACTOR_FIELD_NAMES,
  type ContractorFormValues,
} from "./form";

const nip = z
  .string()
  .transform(nipDigits)
  .refine(
    (digits) => digits === null || digits.length === NIP_LENGTH,
    "NIP składa się z dziesięciu cyfr.",
  );

export const contractorFormSchema = z.object({
  name: z
    .string()
    .min(1, "Podaj nazwę kontrahenta.")
    .max(200, "Ta wartość jest za długa."),
  nip,
});

export function readContractorFormValues(
  formData: FormData,
): ContractorFormValues {
  return readFormValues(formData, CONTRACTOR_FIELD_NAMES);
}
