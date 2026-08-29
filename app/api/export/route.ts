import { todayIso } from "@/lib/dates";
import { listInvoices } from "@/lib/db/queries";
import { readFilterValues, toInvoiceFilters } from "@/lib/invoice-filters";
import { hasValidSession } from "@/lib/session";

const COLUMNS = [
  "Lp.",
  "Numer faktury",
  "Data wystawienia",
  "Sprzedawca",
  "NIP sprzedawcy",
  "Nabywca",
  "NIP nabywcy",
  "Brutto",
  "Netto",
  "VAT",
  "Stawka prowizji [%]",
  "Prowizja",
];

/**
 * Excel w polskiej wersji dzieli kolumny średnikiem, a przecinek traktuje jako
 * separator dziesiętny — plik z przecinkami rozjechałby się na kolumny.
 */
const SEPARATOR = ";";

/** Bez znacznika kolejności bajtów Excel czyta plik jako windows-1250 i psuje polskie znaki. */
const BOM = "\uFEFF";

function escapeCsv(value: string): string {
  if (!/[";\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/** `"1234.56"` na `"1234,56"` — bez separatora tysięcy, żeby Excel widział liczbę. */
function csvAmount(value: string | null): string {
  return value === null ? "" : value.replace(".", ",");
}

export async function GET(request: Request) {
  if (!(await hasValidSession())) {
    return new Response("Brak aktywnej sesji.", { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const invoices = await listInvoices(toInvoiceFilters(readFilterValues(params)));

  const rows = invoices.map((invoice, index) =>
    [
      String(index + 1),
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.sellerName,
      invoice.sellerNip ?? "",
      invoice.buyerName,
      invoice.buyerNip ?? "",
      csvAmount(invoice.grossAmount),
      csvAmount(invoice.netAmount),
      csvAmount(invoice.vatAmount),
      csvAmount(invoice.feeRate),
      csvAmount(invoice.feeAmount),
    ]
      .map(escapeCsv)
      .join(SEPARATOR),
  );

  const csv = [COLUMNS.join(SEPARATOR), ...rows].join("\r\n");

  return new Response(`${BOM}${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="faktury-${todayIso()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
