import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isSessionTokenValid,
} from "@/lib/auth";

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return isSessionTokenValid(store.get(SESSION_COOKIE_NAME)?.value);
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
