"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Images,
  LoaderCircle,
  PencilLine,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { InvoiceForm } from "@/components/invoice-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { todayIso } from "@/lib/dates";
import { compressImage } from "@/lib/image";
import { saveInvoice } from "@/lib/invoice-actions";
import {
  emptyInvoiceFields,
  EMPTY_INVOICE_FORM_VALUES,
  toInvoiceFormValues,
  type InvoiceFieldName,
  type InvoiceFormValues,
} from "@/lib/invoice-form";

/** Odpowiedź `/api/scan`: przy błędzie zamiast danych przychodzi komunikat. */
type ScanResponse = {
  imagePathname?: string;
  data?: Partial<Record<InvoiceFieldName, string | null>>;
  error?: string;
};

type Draft = {
  values: InvoiceFormValues;
  missingFields: InvoiceFieldName[];
  imagePathname: string | null;
  imageSrc: string | null;
};

export function ScanForm() {
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

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

  /** Bez tego wybranie tego samego pliku drugi raz nie odpali `change`. */
  function clearInputs() {
    if (cameraInput.current !== null) cameraInput.current.value = "";
    if (galleryInput.current !== null) galleryInput.current.value = "";
  }

  async function readInvoice(file: File) {
    setError(null);
    setDraft(null);
    setIsReading(true);

    try {
      const prepared = await compressImage(file);
      showPreview(URL.createObjectURL(prepared));

      const body = new FormData();
      body.append("zdjecie", prepared, prepared.name);

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

      const values = toInvoiceFormValues(payload.data);
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
      clearInputs();
    }
  }

  function startOver() {
    showPreview(null);
    setDraft(null);
    setError(null);
    clearInputs();
  }

  function enterManually() {
    showPreview(null);
    setError(null);
    setDraft({
      values: { ...EMPTY_INVOICE_FORM_VALUES, issueDate: todayIso() },
      missingFields: [],
      imagePathname: null,
      imageSrc: null,
    });
  }

  const fileInputs = (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readInvoice(file);
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readInvoice(file);
        }}
      />
    </>
  );

  if (draft !== null) {
    return (
      <div className="space-y-4">
        {fileInputs}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 text-base"
            onClick={() => cameraInput.current?.click()}
          >
            <RotateCcw className="size-5" />
            Zrób zdjęcie jeszcze raz
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-base"
            onClick={startOver}
          >
            Zacznij od nowa
          </Button>
        </div>

        <InvoiceForm
          action={saveInvoice}
          initialValues={draft.values}
          imagePathname={draft.imagePathname}
          imageSrc={draft.imageSrc}
          missingFields={draft.missingFields}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fileInputs}

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {preview === null ? (
            <Camera className="size-10 text-muted-foreground" aria-hidden />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Zdjęcie wysłane do odczytu"
              className="max-h-56 w-auto rounded-lg object-contain"
            />
          )}

          {isReading ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
              Odczytuję fakturę… to potrwa kilka sekund.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ustaw fakturę tak, żeby cała mieściła się w kadrze. Krzywe zdjęcie
              nie przeszkadza.
            </p>
          )}

          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <Button
              type="button"
              className="h-14 text-base"
              disabled={isReading}
              onClick={() => cameraInput.current?.click()}
            >
              <Camera className="size-6" />
              Zrób zdjęcie
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 text-base"
              disabled={isReading}
              onClick={() => galleryInput.current?.click()}
            >
              <Images className="size-5" />
              Wybierz z galerii
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-base"
              disabled={isReading}
              onClick={enterManually}
            >
              <PencilLine className="size-5" />
              Wpisz ręcznie, bez zdjęcia
            </Button>
          </div>
        </CardContent>
      </Card>

      {error === null ? null : (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
