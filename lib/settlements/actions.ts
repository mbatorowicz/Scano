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
  SETTLEMENT_ID_FIELD,
  type SettlementFieldName,
  type SettlementFormState,
} from "./form";
import { readSettlementFormValues, settlementFormSchema } from "./schema";
import { createSettlement, deleteSettlement, updateSettlement } from "./service";

/** Wypłata zmienia saldo, które widać i na liście faktur, i na rozliczeniach. */
function revalidateSettlements(): void {
  revalidatePath("/settlements");
  revalidatePath("/");
}

export async function saveSettlement(
  _previous: SettlementFormState,
  formData: FormData,
): Promise<SettlementFormState> {
  // Akcję da się wywołać zwykłym POST-em, więc sesję sprawdzamy tutaj,
  // niezależnie od tego, że proxy i layout też ją sprawdzają.
  if (!(await hasValidSession())) {
    return failedFormState<SettlementFieldName>(
      "Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.",
    );
  }

  const parsed = settlementFormSchema.safeParse(
    readSettlementFormValues(formData),
  );
  if (!parsed.success) {
    return invalidFormState<SettlementFieldName>(parsed.error);
  }

  /** Brak identyfikatora znaczy, że zapisujemy nową wypłatę. */
  const id = readEntityId(formData, SETTLEMENT_ID_FIELD);

  try {
    const saved =
      id === null
        ? await createSettlement(parsed.data)
        : await updateSettlement(id, parsed.data);

    if (saved === null) {
      return failedFormState<SettlementFieldName>(
        "Nie znaleziono wypłaty do zapisania. Odśwież stronę.",
      );
    }

    revalidateSettlements();
    revalidatePath(`/settlements/${saved.id}`);

    return {
      status: "saved",
      message: id === null ? "Wypłata zapisana." : "Zmiany zapisane.",
      fieldErrors: {},
    };
  } catch (cause) {
    console.error("Zapis wypłaty nie udał się", cause);
    return failedFormState<SettlementFieldName>(
      "Zapis się nie udał. Spróbuj jeszcze raz.",
    );
  }
}

/**
 * Formularz usuwania nie ma gdzie pokazać błędu, więc awarie lecą do granicy
 * błędu segmentu zamiast kończyć się cichym powrotem na listę.
 */
export async function removeSettlement(formData: FormData): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");

  const id = readEntityId(formData, SETTLEMENT_ID_FIELD);
  if (id === null) {
    throw new Error("Formularz usuwania przyszedł bez numeru wypłaty.");
  }

  // Wiersza może już nie być, gdy tę samą wypłatę usunięto w drugiej karcie.
  // Skutek jest ten sam, o który prosił użytkownik, więc to nie jest błąd.
  await deleteSettlement(id);

  revalidateSettlements();
  // Usuwać da się i z listy, i ze strony wypłaty — ta druga po usunięciu
  // wiersza nie ma już czego pokazać, więc zawsze wracamy na listę.
  redirect("/settlements");
}
