import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function InvoiceNotFound() {
  return (
    <div className="space-y-6 py-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nie ma takiej faktury
        </h1>
        <p className="text-sm text-muted-foreground">
          Została usunięta albo adres jest nieaktualny.
        </p>
      </div>

      <Button asChild className="h-12 text-base">
        <Link href="/invoices">
          <ArrowLeft className="size-5" />
          Wróć do faktur
        </Link>
      </Button>
    </div>
  );
}
