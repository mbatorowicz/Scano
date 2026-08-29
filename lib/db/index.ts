import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Brak DATABASE_URL. Uruchom `vercel env pull .env.local` i zrestartuj serwer.",
    );
  }
  return url;
}

/**
 * Klient tworzony leniwie, żeby brak `DATABASE_URL` wysypywał się dopiero przy
 * pierwszym zapytaniu, a nie na etapie budowania stron, które bazy nie tykają.
 */
let client: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  client ??= drizzle(neon(connectionString()), { schema });
  return client;
}

export { schema };
