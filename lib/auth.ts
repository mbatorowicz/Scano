import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "scano_session";

/** 30 dni — apka odpalana z ekranu głównego nie powinna pytać o hasło co wejście. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function readSecret(name: "APP_PASSWORD" | "AUTH_SECRET"): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function equalsInConstantTime(a: string, b: string): boolean {
  const bufferA = sha256(a);
  const bufferB = sha256(b);
  return timingSafeEqual(bufferA, bufferB);
}

export function isAuthConfigured(): boolean {
  return readSecret("APP_PASSWORD") !== null && readSecret("AUTH_SECRET") !== null;
}

export function isPasswordCorrect(candidate: string): boolean {
  const expected = readSecret("APP_PASSWORD");
  if (expected === null) return false;
  return equalsInConstantTime(candidate, expected);
}

function signPayload(payload: string): string {
  const secret = readSecret("AUTH_SECRET");
  if (secret === null) {
    throw new Error("Brak zmiennej AUTH_SECRET — nie da się podpisać sesji.");
  }
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

/** Token ma postać `<sekundy wygaśnięcia>.<podpis HMAC>`. */
export function createSessionToken(now: number = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = String(expiresAt);
  return `${payload}.${signPayload(payload)}`;
}

export function isSessionTokenValid(
  token: string | undefined | null,
  now: number = Date.now(),
): boolean {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  let expected: string;
  try {
    expected = signPayload(payload);
  } catch {
    return false;
  }

  if (!equalsInConstantTime(signature, expected)) return false;

  const expiresAt = Number(payload);
  return Number.isSafeInteger(expiresAt) && expiresAt * 1000 > now;
}
