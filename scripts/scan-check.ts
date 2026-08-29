/**
 * Wysyła zdjęcie faktury na `/api/scan` działającej lokalnie aplikacji
 * i wypisuje odczytane dane. Podpisane ciasteczko sesji generujemy tak samo
 * jak ekran logowania, więc trasa jest sprawdzana razem z autoryzacją.
 *
 * Użycie: npm run scan:check -- "C:\sciezka\do\faktury.jpg"
 */
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

import { loadLocalEnv } from "./env";

const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

async function main() {
  loadLocalEnv();

  const imagePath = process.argv[2];
  if (!imagePath) {
    throw new Error(
      'Podaj ścieżkę do zdjęcia, np. npm run scan:check -- "C:\\faktury\\0350.jpg"',
    );
  }

  const mediaType = MEDIA_TYPES[extname(imagePath).toLowerCase()];
  if (!mediaType) {
    throw new Error(`Nieobsługiwany format pliku: ${extname(imagePath)}`);
  }

  // 127.0.0.1 zamiast localhost, bo na Windowsie localhost bywa rozwiązywany
  // najpierw na IPv6 i połączenie wisi, zanim spadnie na IPv4.
  const baseUrl = process.env.SCANO_URL ?? "http://127.0.0.1:3000";
  const bytes = await readFile(imagePath);
  console.log(`Wysyłam ${basename(imagePath)} (${Math.round(bytes.length / 1024)} KB) na ${baseUrl}/api/scan`);

  const form = new FormData();
  form.set(
    "zdjecie",
    new File([new Uint8Array(bytes)], basename(imagePath), { type: mediaType }),
  );

  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/scan`, {
    method: "POST",
    body: form,
    headers: { cookie: `${SESSION_COOKIE_NAME}=${createSessionToken()}` },
  });

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const body = await response.json();

  console.log(`HTTP ${response.status} po ${seconds} s`);
  console.log(JSON.stringify(body, null, 2));

  if (!response.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
