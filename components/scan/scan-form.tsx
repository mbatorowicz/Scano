"use client";

import { useRef } from "react";
import { RotateCcw } from "lucide-react";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { ScanCapture } from "@/components/scan/scan-capture";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useInvoiceScan } from "@/hooks/use-invoice-scan";
import type { ContractorOption } from "@/lib/contractors/form";
import { knownSellerFormValues } from "@/lib/contractors/known-seller";
import { saveInvoice } from "@/lib/invoices/actions";

export function ScanForm({
  contractors,
}: {
  contractors: readonly ContractorOption[];
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const { preview, isReading, error, draft, readInvoice, startOver, enterManually } =
    useInvoiceScan(knownSellerFormValues(contractors));

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Czyścimy pole od razu, inaczej wybranie tego samego pliku drugi raz
    // nie odpali zdarzenia. Plik jest już w `file`, więc nic nie tracimy.
    event.target.value = "";
    if (file) void readInvoice(file);
  }

  const fileInputs = (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={pickFile}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={pickFile}
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
          contractors={contractors}
          imagePathname={draft.imagePathname}
          imageSrc={draft.imageSrc}
          missingFields={draft.missingFields}
          manual={draft.manual}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fileInputs}

      <ScanCapture
        preview={preview}
        isReading={isReading}
        onCamera={() => cameraInput.current?.click()}
        onGallery={() => galleryInput.current?.click()}
        onManualEntry={enterManually}
      />

      {error === null ? null : <Alert tone="error">{error}</Alert>}
    </div>
  );
}
