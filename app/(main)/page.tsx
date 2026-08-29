import Link from "next/link";
import { Camera, Download } from "lucide-react";

import { InvoiceFilters } from "@/components/invoice-filters";
import { InvoiceTable } from "@/components/invoice-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listInvoices } from "@/lib/db/queries";
import {
  hasAnyFilter,
  readFilterValues,
  toInvoiceFilters,
  toQueryString,
} from "@/lib/invoice-filters";
import { formatCurrency, sumAmounts } from "@/lib/money";

export default async function InvoicesPage(props: PageProps<"/">) {
  const values = readFilterValues(await props.searchParams);
  const invoices = await listInvoices(toInvoiceFilters(values));

  const grossTotal = sumAmounts(invoices.map((invoice) => invoice.grossAmount));
  const feeTotal = sumAmounts(invoices.map((invoice) => invoice.feeAmount));
  const filtered = hasAnyFilter(values);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Faktury</h1>
        <p className="text-sm text-muted-foreground">
          Lista zeskanowanych faktur wraz z sumą prowizji.
        </p>
      </header>

      <InvoiceFilters values={values} />

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {filtered
                ? "Żadna faktura nie pasuje do tych filtrów."
                : "Nie ma tu jeszcze żadnej faktury. Zacznij od zrobienia zdjęcia."}
            </p>
            {filtered ? (
              <Button asChild variant="outline" className="h-12 px-6 text-base">
                <Link href="/">Pokaż wszystkie</Link>
              </Button>
            ) : (
              <Button asChild className="h-12 px-6 text-base">
                <Link href="/scan">
                  <Camera className="size-5" />
                  Skanuj fakturę
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <Summary label="Faktur" value={String(invoices.length)} />
              <Summary label="Wartość brutto" value={formatCurrency(grossTotal)} />
              <Summary label="Prowizja" value={formatCurrency(feeTotal)} />
            </CardContent>
          </Card>

          <InvoiceTable invoices={invoices} />

          <div className="flex justify-end">
            <Button asChild variant="outline" className="h-11 text-base">
              {/* Zwykły odnośnik, nie `Link` — plik ma pobrać przeglądarka, a nie router. */}
              <a href={`/api/export${toQueryString(values)}`} download>
                <Download className="size-5" />
                Pobierz CSV
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
