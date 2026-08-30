"use client";

import { Camera, Images, LoaderCircle, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Ekran przed odczytem: podpowiedź, jak zrobić zdjęcie, i trzy drogi dalej —
 * aparat, galeria albo wpisanie faktury z ręki.
 */
export function ScanCapture({
  preview,
  isReading,
  onCamera,
  onGallery,
  onManualEntry,
}: {
  preview: string | null;
  isReading: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onManualEntry: () => void;
}) {
  return (
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
            onClick={onCamera}
          >
            <Camera className="size-6" />
            Zrób zdjęcie
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 text-base"
            disabled={isReading}
            onClick={onGallery}
          >
            <Images className="size-5" />
            Wybierz z galerii
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-base"
            disabled={isReading}
            onClick={onManualEntry}
          >
            <PencilLine className="size-5" />
            Wpisz ręcznie, bez zdjęcia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
