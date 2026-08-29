/**
 * Skrypty bazodanowe działają poza Next.js, który sam wczytuje `.env.local`,
 * więc tutaj trzeba go podać Node'owi ręcznie.
 */
export function loadLocalEnv(): void {
  if (!process.env.DATABASE_URL) {
    process.loadEnvFile(".env.local");
  }
}
