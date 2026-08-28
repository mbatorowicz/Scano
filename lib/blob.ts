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
