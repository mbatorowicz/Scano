/**
 * Usuwa z magazynu zdjęcia, do których nie prowadzi żadna faktura.
 *
 * Zdjęcie ląduje w Blobie zaraz po udanym odczycie, zanim użytkownik zatwierdzi
 * formularz. Gdy porzuci skan albo zrobi zdjęcie ponownie, plik zostaje bez
 * właściciela — usunięcie faktury sprząta tylko jej własne zdjęcie.
 *
 * Użycie:
 *   npm run blob:clean            wypisuje, co poszłoby do kosza
 *   npm run blob:clean -- --usun  faktycznie usuwa
 */
import { del, list } from "@vercel/blob";

import { INVOICE_BLOB_PREFIX } from "@/lib/blob";
import { listInvoices } from "@/lib/invoices/repository";

import { loadLocalEnv } from "./env";

/**
 * Świeżych plików nie ruszamy. Zdjęcie odczytane minutę temu może czekać
 * w otwartym formularzu na drugim urządzeniu i nie ma jeszcze faktury.
 */
const GRACE_PERIOD_MS = 60 * 60 * 1000;

async function main() {
  loadLocalEnv();

  const deleteForReal = process.argv.includes("--usun");

  const invoices = await listInvoices();
  const inUse = new Set(
    invoices
      .map((invoice) => invoice.imagePathname)
      .filter((pathname): pathname is string => pathname !== null),
  );
  console.log(`Faktur w bazie: ${invoices.length}, w tym ze zdjęciem: ${inUse.size}`);

  const cutoff = Date.now() - GRACE_PERIOD_MS;
  let checked = 0;
  let orphaned = 0;
  let skipped = 0;
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix: INVOICE_BLOB_PREFIX,
      mode: "expanded",
      cursor,
    });

    for (const blob of page.blobs) {
      checked += 1;
      if (inUse.has(blob.pathname)) continue;

      if (blob.uploadedAt.getTime() > cutoff) {
        skipped += 1;
        console.log(`świeże, zostaje  ${blob.pathname}`);
        continue;
      }

      orphaned += 1;
      if (!deleteForReal) {
        console.log(`do usunięcia     ${blob.pathname}`);
        continue;
      }

      await del(blob.pathname);
      console.log(`usunięto         ${blob.pathname}`);
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  console.log(
    `\nZdjęć w magazynie: ${checked}, osieroconych: ${orphaned}, świeżych pominiętych: ${skipped}`,
  );

  if (orphaned > 0 && !deleteForReal) {
    console.log("Nic nie usunięto. Powtórz z: npm run blob:clean -- --usun");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
