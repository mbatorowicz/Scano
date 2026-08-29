"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateSettings } from "@/lib/db/queries";
import { isValidFeeRate } from "@/lib/fees";
import { formatRate, parseAmount } from "@/lib/money";
import {
  FEE_RATE_FIELD,
  type SettingsFormState,
} from "@/lib/settings-form";
import { endSession, hasValidSession } from "@/lib/session";

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function saveFeeRate(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!(await hasValidSession())) {
    return { status: "error", message: "Sesja wygasła. Zaloguj się ponownie." };
  }

  const value = formData.get(FEE_RATE_FIELD);
  const rate = typeof value === "string" ? parseAmount(value) : null;

  if (rate === null || !isValidFeeRate(rate)) {
    return {
      status: "error",
      message: "Stawka musi być liczbą od 0 do 100, na przykład 5 albo 2,5.",
    };
  }

  try {
    const saved = await updateSettings(rate);
    // Ekran skanowania pokazuje stawkę w nagłówku i liczy nią prowizję.
    revalidatePath("/scan");

    return {
      status: "saved",
      message: `Nowe faktury będą liczone stawką ${formatRate(saved.feeRate)}.`,
    };
  } catch (cause) {
    console.error("Zapis stawki prowizji nie udał się", cause);
    return { status: "error", message: "Zapis się nie udał. Spróbuj jeszcze raz." };
  }
}
