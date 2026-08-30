/**
 * Usuwa z magazynu zdjęcia, do których nie prowadzi żadna faktura.
 *
 * Zdjęcie ląduje w Blobie już przy odczycie, zanim użytkownik zatwierdzi
 * formularz. Gdy porzuci skan albo zrobi zdjęcie ponownie, plik zostaje bez
 * właściciela — usunięcie faktury sprząta tylko jej własne zdjęcie.
 *
 * Użycie:
 *   npm run blob:clean            wypisuje, co poszłoby do kosza
 *   npm run blob:clean -- --usun  faktycznie usuwa
 */
import { del, list } from "@vercel/blob";

import { INVOICE_BLOB_PREFIX } from "@/lib/blob";
import { listInvoices } from "@/lib/db/queries";

import { loadLocalEnv } from "./env";

/**
 * Świeżych plików nie ruszamy. Zdjęcie odczytane minutę temu może czekać
 * w otwartym formularzu na drugim urządzeniu i nie ma jeszcze faktury.
 */
const KARENCJA_MS = 60 * 60 * 1000;

async function main() {
  loadLocalEnv();

  const usunNaprawde = process.argv.includes("--usun");

  const invoices = await listInvoices();
  const uzywane = new Set(
    invoices
      .map((invoice) => invoice.imagePathname)
      .filter((pathname): pathname is string => pathname !== null),
  );
  console.log(`Faktur w bazie: ${invoices.length}, w tym ze zdjęciem: ${uzywane.size}`);

  const granica = Date.now() - KARENCJA_MS;
  let sprawdzone = 0;
  let osierocone = 0;
  let pominiete = 0;
  let cursor: string | undefined;

  do {
    const strona = await list({
      prefix: INVOICE_BLOB_PREFIX,
      mode: "expanded",
      cursor,
    });

    for (const blob of strona.blobs) {
      sprawdzone += 1;
      if (uzywane.has(blob.pathname)) continue;

      if (blob.uploadedAt.getTime() > granica) {
        pominiete += 1;
        console.log(`świeże, zostaje  ${blob.pathname}`);
        continue;
      }

      osierocone += 1;
      if (!usunNaprawde) {
        console.log(`do usunięcia     ${blob.pathname}`);
        continue;
      }

      await del(blob.pathname);
      console.log(`usunięto         ${blob.pathname}`);
    }

    cursor = strona.hasMore ? strona.cursor : undefined;
  } while (cursor);

  console.log(
    `\nZdjęć w magazynie: ${sprawdzone}, osieroconych: ${osierocone}, świeżych pominiętych: ${pominiete}`,
  );

  if (osierocone > 0 && !usunNaprawde) {
    console.log("Nic nie usunięto. Powtórz z: npm run blob:clean -- --usun");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
