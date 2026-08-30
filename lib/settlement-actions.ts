"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSettlement, deleteSettlement } from "@/lib/db/queries";
import {
  SETTLEMENT_ID_FIELD,
  type SettlementFormState,
} from "@/lib/settlement-form";
import {
  readSettlementFormValues,
  settlementFieldErrors,
  settlementFormSchema,
} from "@/lib/settlement-schema";
import { hasValidSession } from "@/lib/session";

function failure(message: string): SettlementFormState {
  return { status: "error", message, fieldErrors: {} };
}

function readId(formData: FormData): number | null {
  const value = formData.get(SETTLEMENT_ID_FIELD);
  if (typeof value !== "string" || value.trim() === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function saveSettlement(
  _previous: SettlementFormState,
  formData: FormData,
): Promise<SettlementFormState> {
  // Akcję da się wywołać zwykłym POST-em, więc sesję sprawdzamy tutaj,
  // niezależnie od tego, że proxy i layout też ją sprawdzają.
  if (!(await hasValidSession())) {
    return failure("Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.");
  }

  const parsed = settlementFormSchema.safeParse(
    readSettlementFormValues(formData),
  );
  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Popraw zaznaczone pola i spróbuj jeszcze raz.",
      fieldErrors: settlementFieldErrors(parsed.error),
    };
  }

  try {
    await createSettlement(parsed.data);

    revalidatePath("/settlements");
    revalidatePath("/");

    return { status: "saved", message: "Wypłata zapisana.", fieldErrors: {} };
  } catch (cause) {
    console.error("Zapis wypłaty nie udał się", cause);
    return failure("Zapis się nie udał. Spróbuj jeszcze raz.");
  }
}

export async function removeSettlement(formData: FormData): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");

  const id = readId(formData);
  if (id === null) return;

  await deleteSettlement(id);

  revalidatePath("/settlements");
  revalidatePath("/");
}
