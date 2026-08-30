"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { todayIso } from "@/lib/dates";
import { compressImage } from "@/lib/image";
import {
  emptyInvoiceFields,
  EMPTY_INVOICE_FORM_VALUES,
  toInvoiceFormValues,
  type InvoiceFieldName,
  type InvoiceFormValues,
} from "@/lib/invoices/form";
import { SCAN_PHOTO_FIELD } from "@/lib/scan/upload";

/** Odpowiedź `/api/scan`: przy błędzie zamiast danych przychodzi komunikat. */
type ScanResponse = {
  imagePathname?: string;
  data?: Partial<Record<InvoiceFieldName, string | null>>;
  error?: string;
};

/** Odczyt gotowy do sprawdzenia w formularzu. */
export type InvoiceScanDraft = {
  values: InvoiceFormValues;
  missingFields: InvoiceFieldName[];
  imagePathname: string | null;
  imageSrc: string | null;
};

/**
 * Droga od pliku ze zdjęciem do wypełnionego formularza: kompresja, wysyłka
 * na `/api/scan` i przeniesienie odpowiedzi do pól. Ekran skanowania trzyma
 * dzięki temu tylko przyciski i to, co widać.
 */
export function useInvoiceScan(defaults?: Partial<InvoiceFormValues>) {
  const router = useRouter();
  const previewUrl = useRef<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<InvoiceScanDraft | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl.current !== null) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  function showPreview(url: string | null) {
    if (previewUrl.current !== null) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = url;
    setPreview(url);
  }

  async function readInvoice(file: File) {
    setError(null);
    setDraft(null);
    setIsReading(true);

    try {
      const prepared = await compressImage(file);
      showPreview(URL.createObjectURL(prepared));

      const body = new FormData();
      body.append(SCAN_PHOTO_FIELD, prepared, prepared.name);

      const response = await fetch("/api/scan", { method: "POST", body });
      const payload: ScanResponse | null = await response
        .json()
        .catch(() => null);

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || payload?.data === undefined) {
        setError(
          payload?.error ?? "Odczyt faktury się nie udał. Spróbuj jeszcze raz.",
        );
        return;
      }

      const values = {
        ...toInvoiceFormValues(payload.data),
        ...defaults,
      };
      setDraft({
        values,
        missingFields: emptyInvoiceFields(values),
        imagePathname: payload.imagePathname ?? null,
        imageSrc: previewUrl.current,
      });
    } catch (cause) {
      console.error("Wysyłka zdjęcia nie udała się", cause);
      setError(
        "Nie udało się wysłać zdjęcia. Sprawdź połączenie i spróbuj jeszcze raz.",
      );
    } finally {
      setIsReading(false);
    }
  }

  function startOver() {
    showPreview(null);
    setDraft(null);
    setError(null);
  }

  /** Faktura bez zdjęcia: pusty formularz z dzisiejszą datą. */
  function enterManually() {
    showPreview(null);
    setError(null);
    setDraft({
      values: {
        ...EMPTY_INVOICE_FORM_VALUES,
        ...defaults,
        issueDate: todayIso(),
      },
      missingFields: [],
      imagePathname: null,
      imageSrc: null,
    });
  }

  return {
    preview,
    isReading,
    error,
    draft,
    readInvoice,
    startOver,
    enterManually,
  };
}
