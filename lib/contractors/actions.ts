"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  failedFormState,
  invalidFormState,
  readEntityId,
} from "@/lib/forms/form-state";
import { hasValidSession } from "@/lib/session";

import {
  CONTRACTOR_ID_FIELD,
  type ContractorFieldName,
  type ContractorFormState,
} from "./form";
import { contractorFormSchema, readContractorFormValues } from "./schema";
import {
  ContractorConflictError,
  deleteContractor,
  renameContractor,
} from "./service";

function failure(message: string): ContractorFormState {
  return failedFormState<ContractorFieldName>(message);
}

function revalidateContractors(id?: number): void {
  revalidatePath("/contractors");
  revalidatePath("/invoices");
  revalidatePath("/");
  if (id !== undefined) revalidatePath(`/contractors/${id}`);
}

export async function saveContractor(
  _previous: ContractorFormState,
  formData: FormData,
): Promise<ContractorFormState> {
  if (!(await hasValidSession())) {
    return failure("Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.");
  }

  const parsed = contractorFormSchema.safeParse(
    readContractorFormValues(formData),
  );
  if (!parsed.success) {
    return invalidFormState<ContractorFieldName>(parsed.error);
  }

  const id = readEntityId(formData, CONTRACTOR_ID_FIELD);
  if (id === null) {
    return failure("Nie znaleziono kontrahenta do zapisania. Odśwież stronę.");
  }

  try {
    const saved = await renameContractor(id, parsed.data);
    if (saved === null) {
      return failure("Nie znaleziono kontrahenta do zapisania. Odśwież stronę.");
    }

    revalidateContractors(saved.id);

    return {
      status: "saved",
      message: "Zmiany zapisane.",
      fieldErrors: {},
    };
  } catch (cause) {
    if (cause instanceof ContractorConflictError) {
      return {
        status: "invalid",
        message: cause.message,
        fieldErrors: { name: cause.message },
      };
    }

    console.error("Zapis kontrahenta nie udał się", cause);
    return failure("Zapis się nie udał. Spróbuj jeszcze raz.");
  }
}

export async function removeContractor(formData: FormData): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");

  const id = readEntityId(formData, CONTRACTOR_ID_FIELD);
  if (id === null) {
    throw new Error("Formularz usuwania przyszedł bez numeru kontrahenta.");
  }

  await deleteContractor(id);

  revalidateContractors();
  redirect("/contractors");
}
