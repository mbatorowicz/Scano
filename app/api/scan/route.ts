import { del, put } from "@vercel/blob";

import {
  extractInvoiceWithFallback,
  InvoiceScanError,
  isExtractionConfigured,
} from "@/lib/ai/extract-invoice";
import {
  recallScan,
  rememberScan,
  scanFingerprint,
} from "@/lib/ai/recent-scans";
import {
  invoiceBlobPathname,
  invoiceImageHref,
  isSupportedImageType,
  MAX_IMAGE_BYTES,
} from "@/lib/blob";
import { recordAiUsage } from "@/lib/db/queries";
import { hasValidSession } from "@/lib/session";

/** Gemini potrzebuje kilku sekund na zdjęcie faktury, czasem kilkunastu. */
export const maxDuration = 60;

const FIELD_NAME = "zdjecie";

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

  const file = formData.get(FIELD_NAME);
  if (!(file instanceof File) || file.size === 0) {
    return error("Nie wybrano zdjęcia faktury.", 400);
  }

  if (!isSupportedImageType(file.type)) {
    return error(
      "Ten format pliku nie jest obsługiwany. Zrób zdjęcie aparatem albo wybierz plik JPG lub PNG.",
      415,
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return error("Zdjęcie jest za duże. Maksymalny rozmiar to 10 MB.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fingerprint = scanFingerprint(bytes);
  const remembered = recallScan(fingerprint);

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

  // To samo zdjęcie drugi raz oddajemy z pamięci: odczyt jest ten sam, a
  // dobowy limit zostaje na kolejną fakturę.
  if (remembered !== null) {
    return Response.json({
      imagePathname: pathname,
      imageHref: invoiceImageHref(pathname),
      data: remembered.data,
    });
  }

  try {
    const result = await extractInvoiceWithFallback(bytes, file.type);

    rememberScan(fingerprint, result);
    await recordAiUsage({ model: result.model, ...result.usage });

    return Response.json({
      imagePathname: pathname,
      imageHref: invoiceImageHref(pathname),
      data: result.data,
    });
  } catch (cause) {
    // Zdjęcie bez odczytanych danych nie ma po co zostawać w magazynie —
    // użytkownik i tak zrobi je ponownie.
    await del(pathname).catch((deleteError) => {
      console.error("Nie udało się usunąć zdjęcia po nieudanym odczycie", deleteError);
    });

    if (cause instanceof InvoiceScanError) {
      console.error("Odczyt faktury nie udał się", cause.cause ?? cause);
      return error(cause.message, cause.status);
    }

    console.error("Nieoczekiwany błąd odczytu faktury", cause);
    return error("Odczyt faktury się nie udał.", 500);
  }
}
