import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DeleteInvoice } from "@/components/invoices/delete-invoice";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { Button } from "@/components/ui/button";
import { invoiceImageHref } from "@/lib/blob";
import { saveInvoice } from "@/lib/invoices/actions";
import { toInvoiceFormValues } from "@/lib/invoices/form";
import { getInvoice } from "@/lib/invoices/repository";
import { formatAmount } from "@/lib/money";

export const metadata: Metadata = {
  title: "Faktura",
};

function invoiceId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function InvoicePage(props: PageProps<"/invoices/[id]">) {
  const { id } = await props.params;
  const parsedId = invoiceId(id);
  if (parsedId === null) notFound();

  const invoice = await getInvoice(parsedId);
  if (invoice === null) notFound();

  // Kwoty wracają z bazy jako "750.00", a w formularzu mają wyglądać tak,
  // jak stoją na fakturze.
  const values = toInvoiceFormValues({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    sellerName: invoice.sellerName,
    sellerNip: invoice.sellerNip,
    buyerName: invoice.buyerName,
    buyerNip: invoice.buyerNip,
    grossAmount: formatAmount(invoice.grossAmount),
    netAmount: invoice.netAmount === null ? null : formatAmount(invoice.netAmount),
    vatAmount: invoice.vatAmount === null ? null : formatAmount(invoice.vatAmount),
    costAmount: formatAmount(invoice.costAmount),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" className="h-11 text-base">
          <Link href="/invoices">
            <ArrowLeft className="size-5" />
            Faktury
          </Link>
        </Button>
        <DeleteInvoice id={invoice.id} invoiceNumber={invoice.invoiceNumber} />
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {invoice.invoiceNumber}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invoice.sellerName} → {invoice.buyerName}
        </p>
      </header>

      {invoice.imagePathname === null ? null : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={invoiceImageHref(invoice.imagePathname)}
            alt={`Zdjęcie faktury ${invoice.invoiceNumber}`}
            // Ograniczenie wysokości, żeby formularz nie uciekał daleko
            // pod ekran przy zdjęciu zrobionym pionowo.
            className="max-h-[70vh] w-full bg-muted object-contain"
          />
        </div>
      )}

      <InvoiceForm
        action={saveInvoice}
        initialValues={values}
        invoiceId={invoice.id}
        imagePathname={invoice.imagePathname}
        submitLabel="Zapisz zmiany"
      />
    </div>
  );
}
