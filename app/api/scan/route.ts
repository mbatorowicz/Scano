import { put } from "@vercel/blob";

import { recordAiUsage } from "@/lib/ai-usage/service";
import { canonizeExtractedInvoice } from "@/lib/ai/invoice-extraction/canonize";
import {
  extractInvoiceWithFallback,
  InvoiceScanError,
  isExtractionConfigured,
  type ExtractionResult,
} from "@/lib/ai/invoice-extraction";
import {
  recallScan,
  rememberScan,
  scanFingerprint,
} from "@/lib/ai/recent-scans";
import { invoiceBlobPathname, invoiceImageHref } from "@/lib/blob";
import { readScanUpload } from "@/lib/scan/upload";
import { hasValidSession } from "@/lib/session";

/** Gemini potrzebuje kilku sekund na zdjęcie faktury, czasem kilkunastu. */
export const maxDuration = 60;

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!(await hasValidSession())) {
    return error("Brak aktywnej sesji. Zaloguj się ponownie.", 401);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return error("Magazyn zdjęć nie jest podłączony.", 503);
  }

  if (!isExtractionConfigured()) {
    return error(
      "Brak klucza do Gemini. Uzupełnij GOOGLE_GENERATIVE_AI_API_KEY.",
      503,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error("Nie udało się odczytać wysłanego zdjęcia.", 400);
  }

  const upload = readScanUpload(formData);
  if (!upload.ok) return error(upload.message, upload.status);

  const { file } = upload;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fingerprint = scanFingerprint(bytes);

  // To samo zdjęcie drugi raz oddajemy z pamięci: odczyt jest ten sam, a
  // dobowy limit zostaje na kolejną fakturę.
  let result: ExtractionResult | null = recallScan(fingerprint);

  if (result === null) {
    try {
      result = await extractInvoiceWithFallback(bytes, file.type);
    } catch (cause) {
      if (cause instanceof InvoiceScanError) {
        console.error("Odczyt faktury nie udał się", cause.cause ?? cause);
        return error(cause.message, cause.status);
      }

      console.error("Nieoczekiwany błąd odczytu faktury", cause);
      return error("Odczyt faktury się nie udał.", 500);
    }

    // Odczyt zapamiętujemy przed wysłaniem zdjęcia do magazynu: gdyby ta
    // wysyłka się nie udała, ponowna próba nie zabierze kolejnego odczytu
    // z dobowego limitu.
    rememberScan(fingerprint, result);
    await recordAiUsage({ model: result.model, ...result.usage });
  }

  // Zdjęcie ląduje w magazynie dopiero wtedy, gdy są dane — nieudany odczyt nie
  // zostawia po sobie pliku bez faktury. Własną ścieżkę dostaje też odczyt
  // wyjęty z pamięci: dwa wiersze nie mogą wskazywać tego samego pliku, bo
  // usunięcie jednej faktury zabrałoby zdjęcie drugiej.
  let pathname: string;
  try {
    const uploaded = await put(invoiceBlobPathname(file.type), file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
    });
    pathname = uploaded.pathname;
  } catch (cause) {
    console.error("Zapis zdjęcia w Blob nie udał się", cause);
    return error("Nie udało się zapisać zdjęcia. Spróbuj ponownie.", 502);
  }

  return Response.json({
    imagePathname: pathname,
    imageHref: invoiceImageHref(pathname),
    data: await canonizeExtractedInvoice(result.data),
  });
}
