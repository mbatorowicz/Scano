import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import type { Invoice } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/money";

/**
 * Lp. liczymy przy wyświetlaniu, a nie z `id` — po usunięciu faktury numeracja
 * ma iść dalej bez dziur. Na telefonie tyle kolumn się nie mieści, więc
 * zamiast tabeli pokazujemy listę kart.
 */
export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <>
      <ul className="space-y-2 sm:hidden">
        {invoices.map((invoice, index) => (
          <li key={invoice.id}>
            <Link
              href={`/invoice/${invoice.id}`}
              className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <span className="flex-1 space-y-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {index + 1}. {formatDate(invoice.issueDate)}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(invoice.grossAmount)}
                  </span>
                </span>
                <span className="block truncate text-sm font-medium">
                  {invoice.sellerName}
                </span>
                <span className="flex items-baseline justify-between gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{invoice.buyerName}</span>
                  <span className="shrink-0">
                    dla mnie {formatCurrency(invoice.payoutAmount)}
                  </span>
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Lp.</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Sprzedawca</TableHead>
              <TableHead>Nabywca</TableHead>
              <TableHead className="text-right">Brutto</TableHead>
              <TableHead className="text-right">Cena dla mnie</TableHead>
              <TableHead className="text-right">Dla mnie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice, index) => (
              <TableRow key={invoice.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <Link
                    href={`/invoice/${invoice.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {formatDate(invoice.issueDate)}
                  </Link>
                </TableCell>
                <TableCell className="max-w-56 truncate">{invoice.sellerName}</TableCell>
                <TableCell className="max-w-56 truncate">{invoice.buyerName}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.grossAmount)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(invoice.costAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(invoice.payoutAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
