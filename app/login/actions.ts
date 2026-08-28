"use server";

import { redirect } from "next/navigation";

import { isAuthConfigured, isPasswordCorrect } from "@/lib/auth";
import { startSession } from "@/lib/session";

export type LoginState = { error: string | null };

export const initialLoginState: LoginState = { error: null };

/** Przepuszczamy tylko ścieżki wewnątrz aplikacji, żeby nie dało się przekierować na obcą domenę. */
function safeRedirectTarget(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return {
      error:
        "Aplikacja nie ma skonfigurowanego hasła. Uzupełnij APP_PASSWORD i AUTH_SECRET w .env.local.",
    };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "Podaj hasło." };
  }

  if (!isPasswordCorrect(password)) {
    // Krótka pauza spowalnia zgadywanie hasła metodą prób i błędów.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { error: "Nieprawidłowe hasło." };
  }

  await startSession();
  redirect(safeRedirectTarget(formData.get("dalej")));
}
