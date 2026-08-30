import Link from "next/link";
import { Camera, ChevronRight, Download } from "lucide-react";

import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { SummaryStat } from "@/components/summary-stat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  hasAnyFilter,
  readFilterValues,
  toInvoiceFilters,
  toQueryString,
} from "@/lib/invoices/filters";
import { listInvoices } from "@/lib/invoices/repository";
import { formatCurrency, sumAmounts, toMinorUnits } from "@/lib/money";
import { getBalance } from "@/lib/settlements/repository";

export default async function InvoicesPage(props: PageProps<"/">) {
  const values = readFilterValues(await props.searchParams);
  const [invoices, balance] = await Promise.all([
    listInvoices(toInvoiceFilters(values)),
    getBalance(),
  ]);

  const grossTotal = sumAmounts(invoices.map((invoice) => invoice.grossAmount));
  const costTotal = sumAmounts(invoices.map((invoice) => invoice.costAmount));
  const payoutTotal = sumAmounts(invoices.map((invoice) => invoice.payoutAmount));
  const filtered = hasAnyFilter(values);

  const outstanding = toMinorUnits(balance.outstanding) ?? 0n;
  // Pasek salda pomijamy, dopóki nie ma czego rozliczać — na pustej apce
  // „Do wypłaty 0,00 zł" to tylko szum.
  const showBalance =
    outstanding !== 0n || (toMinorUnits(balance.paid) ?? 0n) !== 0n;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Faktury</h1>
        <p className="text-sm text-muted-foreground">
          Lista zeskanowanych faktur wraz z sumą należności dla mnie.
        </p>
      </header>

      <InvoiceFilters values={values} />

      {showBalance ? (
        <Link
          href="/settlements"
          className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <span className="flex-1 space-y-0.5">
            <span className="block text-xs text-muted-foreground">
              {outstanding < 0n ? "Wypłacone z góry" : "Do wypłaty"} — ze
              wszystkich faktur, niezależnie od filtrów
            </span>
            <span className="block text-lg font-semibold">
              {formatCurrency(balance.outstanding)}
            </span>
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Link>
      ) : null}

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
            <CardContent className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <SummaryStat label="Faktur" value={String(invoices.length)} />
              <SummaryStat
                label="Suma zakupów"
                value={formatCurrency(costTotal)}
              />
              <SummaryStat
                label="Suma sprzedaży"
                value={formatCurrency(grossTotal)}
              />
              <SummaryStat label="Dla mnie" value={formatCurrency(payoutTotal)} />
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
