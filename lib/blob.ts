/**
 * Wszystkie zdjęcia faktur trafiają pod ten prefiks. Trasa serwująca pliki
 * przepuszcza tylko ten prefiks, więc nie da się nią czytać reszty magazynu.
 */
export const INVOICE_BLOB_PREFIX = "faktury/";

export function isInvoiceBlobPathname(pathname: string): boolean {
  return pathname.startsWith(INVOICE_BLOB_PREFIX) && !pathname.includes("..");
}

/** Adres, pod którym zdjęcie wystawia nasza własna trasa sprawdzająca sesję. */
export function invoiceImageHref(pathname: string): string {
  const encoded = pathname.split("/").map(encodeURIComponent).join("/");
  return `/api/image/${encoded}`;
}

/** Formaty, które przyjmuje zarówno aparat w telefonie, jak i Gemini. */
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function isSupportedImageType(mediaType: string): boolean {
  return mediaType in EXTENSIONS;
}

/**
 * Odwrotność `EXTENSIONS`: z rozszerzenia pliku na typ MIME. Potrzebna skryptom,
 * które czytają zdjęcie z dysku, a tam typu nie podaje przeglądarka.
 */
export function imageTypeForExtension(extension: string): string | null {
  const normalized = extension.toLowerCase().replace(/^\./, "");
  const canonical = normalized === "jpeg" ? "jpg" : normalized;

  const found = Object.entries(EXTENSIONS).find(
    ([, candidate]) => candidate === canonical,
  );
  return found?.[0] ?? null;
}

/**
 * Ścieżka w magazynie: rok i miesiąc pomagają się połapać w plikach,
 * a losowy sufiks dokłada `put`, więc dwa zdjęcia w tej samej sekundzie
 * się nie nadpiszą.
 */
export function invoiceBlobPathname(mediaType: string, now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${INVOICE_BLOB_PREFIX}${year}-${month}/faktura.${EXTENSIONS[mediaType] ?? "jpg"}`;
}
