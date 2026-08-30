"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Miniatura do porównania z odczytem; po kliknięciu zdjęcie na cały ekran.
 * Zwykły `img`, a nie `next/image`: adres to albo lokalne `blob:` ze świeżo
 * zrobionego zdjęcia, albo prywatna trasa `/api/image` — optymalizator i tak
 * nie ma tu nic do roboty.
 */
export function InvoicePhoto({ src }: { src: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left ring-1 ring-foreground/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Miniatura zeskanowanej faktury"
            className="h-20 w-16 shrink-0 rounded-md bg-muted object-cover"
          />
          <span className="text-sm text-muted-foreground">
            Zdjęcie faktury. Dotknij, żeby powiększyć i porównać z odczytem.
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-2xl">
        <DialogTitle>Zdjęcie faktury</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Zeskanowana faktura"
          className="max-h-[70vh] w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
