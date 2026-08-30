/**
 * Zapytania o faktury i nic więcej: żadnych reguł biznesowych, żadnego
 * liczenia należności. Wiersz do zapisu przychodzi tu już policzony przez
 * `service.ts`, więc czytając ten plik widać dokładnie, co dzieje się w bazie.
 *
 * Nazwy stron nie stoją na fakturze — dołączamy je z `contractors`, żeby
 * poprawka nazwy w słowniku była od razu widoczna na liście i w eksporcie.
 */
import { and, desc, eq, getTableColumns, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { isIsoDate } from "@/lib/dates";
import { getDb } from "@/lib/db/index";
import {
  contractors,
  invoices,
  type Invoice,
  type NewInvoice,
} from "@/lib/db/schema";

import type { InvoiceFilters } from "./filters";

/** Kolumny, które ustawia aplikacja; `id` i `created_at` dokłada baza. */
export type InvoiceRow = Omit<NewInvoice, "id" | "createdAt">;

/** Faktura z nazwami i NIP-ami stron wyjętymi ze słownika. */
export type InvoiceWithParties = Invoice & {
  sellerName: string;
  sellerNip: string | null;
  buyerName: string;
  buyerNip: string | null;
  recipientName: string | null;
  recipientNip: string | null;
};

/** Znaki, które w `LIKE` znaczą „cokolwiek" — w tekście od użytkownika mają być zwykłymi znakami. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function filterConditions(
  filters: InvoiceFilters,
  recipients: ReturnType<typeof alias<typeof contractors, "recipients">>,
): SQL | undefined {
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
      ilike(recipients.name, pattern),
    );
    if (match) conditions.push(match);
  }

  return conditions.length === 0 ? undefined : and(...conditions);
}

function invoicesWithParties() {
  const sellers = alias(contractors, "sellers");
  const buyers = alias(contractors, "buyers");
  const recipients = alias(contractors, "recipients");

  return {
    sellers,
    buyers,
    recipients,
    query: getDb()
      .select({
        ...getTableColumns(invoices),
        sellerName: sellers.name,
        sellerNip: sellers.nip,
        buyerName: buyers.name,
        buyerNip: buyers.nip,
        recipientName: recipients.name,
        recipientNip: recipients.nip,
      })
      .from(invoices)
      .innerJoin(sellers, eq(invoices.sellerId, sellers.id))
      .innerJoin(buyers, eq(invoices.buyerId, buyers.id))
      .leftJoin(recipients, eq(invoices.recipientId, recipients.id)),
  };
}

/** Faktury od najnowszej; `id` rozstrzyga kolejność w obrębie jednego dnia. */
export async function listInvoices(
  filters: InvoiceFilters = {},
): Promise<InvoiceWithParties[]> {
  const { recipients, query } = invoicesWithParties();
  return query
    .where(filterConditions(filters, recipients))
    .orderBy(desc(invoices.issueDate), desc(invoices.id));
}

export async function getInvoice(
  id: number,
): Promise<InvoiceWithParties | null> {
  const { query } = invoicesWithParties();
  const [row] = await query.where(eq(invoices.id, id)).limit(1);
  return row ?? null;
}

/**
 * Ta sama faktura zeskanowana dwa razy to najczęstsza pomyłka przy wklepywaniu
 * stosu papierów, więc przed zapisem sprawdzamy numer razem ze sprzedawcą.
 */
export async function findDuplicateInvoice(
  invoiceNumber: string,
  sellerId: number,
  excludeId?: number,
): Promise<InvoiceWithParties | null> {
  const { query } = invoicesWithParties();
  const rows = await query
    .where(
      and(
        eq(invoices.invoiceNumber, invoiceNumber.trim()),
        eq(invoices.sellerId, sellerId),
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
