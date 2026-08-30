import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Nie ma takiej strony",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nie ma takiej strony
        </h1>
        <p className="text-sm text-muted-foreground">
          Adres jest nieaktualny albo z literówką.
        </p>
      </div>

      <Button asChild className="h-12 text-base">
        <Link href="/invoices">
          <ReceiptText className="size-5" />
          Wróć do faktur
        </Link>
      </Button>
    </div>
  );
}
