import { defineConfig } from "drizzle-kit";

// drizzle-kit działa poza Next.js, więc zmienne z .env.local trzeba wczytać samemu.
if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env.local");
}

// Migracje puszczamy po połączeniu bezpośrednim, nie przez pooler — pooler potrafi
// zerwać dłuższe DDL w połowie.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "Brak DATABASE_URL w .env.local. Uruchom `vercel env pull .env.local`.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
