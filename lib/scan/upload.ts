/**
 * Wspólny kontrakt wysyłki zdjęcia na `/api/scan`: nazwa pola, którą wpisuje
 * przeglądarka, i sprawdzenie pliku razem z kodem HTTP, jaki trasa ma odesłać.
 * Trasa zostaje wtedy przy samym HTTP, a przeglądarka i serwer nie mogą się
 * rozjechać co do nazwy pola.
 */
import { isSupportedImageType } from "@/lib/blob";
import { MAX_IMAGE_BYTES } from "@/lib/config";

export const SCAN_PHOTO_FIELD = "photo";

export type ScanUpload =
  | { ok: true; file: File }
  | { ok: false; message: string; status: number };

export function readScanUpload(formData: FormData): ScanUpload {
  const file = formData.get(SCAN_PHOTO_FIELD);

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Nie wybrano zdjęcia faktury.", status: 400 };
  }

  if (!isSupportedImageType(file.type)) {
    return {
      ok: false,
      message:
        "Ten format pliku nie jest obsługiwany. Zrób zdjęcie aparatem albo wybierz plik JPG lub PNG.",
      status: 415,
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const megabytes = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    return {
      ok: false,
      message: `Zdjęcie jest za duże. Maksymalny rozmiar to ${megabytes} MB.`,
      status: 413,
    };
  }

  return { ok: true, file };
}
