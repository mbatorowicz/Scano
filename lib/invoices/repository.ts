/**
 * Zapytania o faktury i nic więcej: żadnych reguł biznesowych, żadnego
 * liczenia należności. Wiersz do zapisu przychodzi tu już policzony przez
 * `service.ts`, więc czytając ten plik widać dokładnie, co dzieje się w bazie.
 */
import { and, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";

import { isIsoDate } from "@/lib/dates";
import { getDb } from "@/lib/db/index";
import { invoices, type Invoice, type NewInvoice } from "@/lib/db/schema";

import type { InvoiceFilters } from "./filters";

/** Kolumny, które ustawia aplikacja; `id` i `created_at` dokłada baza. */
export type InvoiceRow = Omit<NewInvoice, "id" | "createdAt">;

/** Znaki, które w `LIKE` znaczą „cokolwiek" — w tekście od użytkownika mają być zwykłymi znakami. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function filterConditions(filters: InvoiceFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (isIsoDate(filters.from)) {
    conditions.push(gte(invoices.issueDate, filters.from));
  }
  if (isIsoDate(filters.to)) {
    conditions.push(lte(invoices.issueDate, filters.to));
  }

  const search = filters.search?.trim();
  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    const match = or(
      ilike(invoices.invoiceNumber, pattern),
      ilike(invoices.sellerName, pattern),
      ilike(invoices.buyerName, pattern),
    );
    if (match) conditions.push(match);
  }

  return conditions.length === 0 ? undefined : and(...conditions);
}

/** Faktury od najnowszej; `id` rozstrzyga kolejność w obrębie jednego dnia. */
export async function listInvoices(
  filters: InvoiceFilters = {},
): Promise<Invoice[]> {
  return getDb()
    .select()
    .from(invoices)
    .where(filterConditions(filters))
    .orderBy(desc(invoices.issueDate), desc(invoices.id));
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const [row] = await getDb()
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Ta sama faktura zeskanowana dwa razy to najczęstsza pomyłka przy wklepywaniu
 * stosu papierów, więc przed zapisem sprawdzamy numer razem ze sprzedawcą.
 */
export async function findDuplicateInvoice(
  invoiceNumber: string,
  sellerName: string,
  excludeId?: number,
): Promise<Invoice | null> {
  const rows = await getDb()
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.invoiceNumber, invoiceNumber.trim()),
        // `ilike` bez wieloznaczników działa jak porównanie bez względu na wielkość
        // liter — ta sama firma bywa wpisana raz z dużych, raz z małych.
        ilike(invoices.sellerName, escapeLikePattern(sellerName.trim())),
      ),
    )
    .limit(2);

  return rows.find((row) => row.id !== excludeId) ?? null;
}

export async function insertInvoice(values: InvoiceRow): Promise<Invoice> {
  const [row] = await getDb().insert(invoices).values(values).returning();
  return row;
}

export async function updateInvoiceRow(
  id: number,
  values: InvoiceRow,
): Promise<Invoice | null> {
  const [row] = await getDb()
    .update(invoices)
    .set(values)
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}

export async function deleteInvoiceRow(id: number): Promise<Invoice | null> {
  const [row] = await getDb()
    .delete(invoices)
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}
