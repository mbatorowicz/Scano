import { and, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";

import { calculateFee, DEFAULT_FEE_RATE, isValidFeeRate } from "@/lib/fees";
import { parseAmount } from "@/lib/money";

import { getDb } from "./index";
import { invoices, settings, type Invoice } from "./schema";

export type InvoiceInput = {
  invoiceNumber: string;
  /** Data w formacie ISO (`2026-08-12`), tak jak trzyma ją kolumna `date`. */
  issueDate: string;
  sellerName: string;
  sellerNip?: string | null;
  buyerName: string;
  buyerNip?: string | null;
  grossAmount: string;
  netAmount?: string | null;
  vatAmount?: string | null;
  imagePathname?: string | null;
  /** Gdy pusta, bierzemy aktualną stawkę z ustawień. */
  feeRate?: string | null;
};

export type InvoiceFilters = {
  /** Początek zakresu dat wystawienia, ISO. */
  from?: string | null;
  /** Koniec zakresu dat wystawienia, ISO. */
  to?: string | null;
  /** Szukanie po numerze faktury albo nazwie któregokolwiek kontrahenta. */
  search?: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Znaki, które w `LIKE` znaczą „cokolwiek" — w tekście od użytkownika mają być zwykłymi znakami. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Stawka w postaci gotowej do zapisu albo `null`, gdy wartości nie da się użyć. */
function normalizeFeeRate(value: string | null | undefined): string | null {
  return isValidFeeRate(value) ? parseAmount(value) : null;
}

function filterConditions(filters: InvoiceFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.from && ISO_DATE.test(filters.from)) {
    conditions.push(gte(invoices.issueDate, filters.from));
  }
  if (filters.to && ISO_DATE.test(filters.to)) {
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

class InvalidAmountError extends Error {
  constructor(field: string) {
    super(`Nie udało się odczytać kwoty w polu ${field}.`);
    this.name = "InvalidAmountError";
  }
}

function requireAmount(value: string, field: string): string {
  const parsed = parseAmount(value);
  if (parsed === null) throw new InvalidAmountError(field);
  return parsed;
}

function optionalAmount(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  return parseAmount(value);
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const feeRate =
    normalizeFeeRate(input.feeRate) ?? (await getSettings()).feeRate;

  const grossAmount = requireAmount(input.grossAmount, "wartość brutto");
  const feeAmount = calculateFee(grossAmount, feeRate);
  if (feeAmount === null) throw new InvalidAmountError("prowizja");

  const [row] = await getDb()
    .insert(invoices)
    .values({
      invoiceNumber: input.invoiceNumber.trim(),
      issueDate: input.issueDate,
      sellerName: input.sellerName.trim(),
      sellerNip: normalizeNip(input.sellerNip),
      buyerName: input.buyerName.trim(),
      buyerNip: normalizeNip(input.buyerNip),
      grossAmount,
      netAmount: optionalAmount(input.netAmount),
      vatAmount: optionalAmount(input.vatAmount),
      feeRate,
      feeAmount,
      imagePathname: input.imagePathname ?? null,
    })
    .returning();

  return row;
}

/**
 * Przy edycji zostawiamy stawkę zapisaną razem z fakturą, ale prowizję liczymy
 * od nowa — inaczej po poprawieniu kwoty brutto kwota prowizji przestałaby się
 * zgadzać ze stawką.
 */
export async function updateInvoice(
  id: number,
  input: InvoiceInput,
): Promise<Invoice | null> {
  const current = await getInvoice(id);
  if (current === null) return null;

  const feeRate = normalizeFeeRate(input.feeRate) ?? current.feeRate;

  const grossAmount = requireAmount(input.grossAmount, "wartość brutto");
  const feeAmount = calculateFee(grossAmount, feeRate);
  if (feeAmount === null) throw new InvalidAmountError("prowizja");

  const [row] = await getDb()
    .update(invoices)
    .set({
      invoiceNumber: input.invoiceNumber.trim(),
      issueDate: input.issueDate,
      sellerName: input.sellerName.trim(),
      sellerNip: normalizeNip(input.sellerNip),
      buyerName: input.buyerName.trim(),
      buyerNip: normalizeNip(input.buyerNip),
      grossAmount,
      netAmount: optionalAmount(input.netAmount),
      vatAmount: optionalAmount(input.vatAmount),
      feeRate,
      feeAmount,
      imagePathname: input.imagePathname ?? current.imagePathname,
    })
    .where(eq(invoices.id, id))
    .returning();

  return row ?? null;
}

export async function deleteInvoice(id: number): Promise<Invoice | null> {
  const [row] = await getDb()
    .delete(invoices)
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}

/** NIP zapisujemy bez kresek i spacji, żeby dwa zapisy tego samego numeru się nie rozjechały. */
function normalizeNip(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length === 0 ? null : digits;
}

/** Wiersz ustawień powinien istnieć po seedzie, ale dorabiamy go, gdyby zniknął. */
export async function getSettings(): Promise<{ feeRate: string }> {
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (row) return { feeRate: row.feeRate };

  const [created] = await db
    .insert(settings)
    .values({ id: 1, feeRate: DEFAULT_FEE_RATE })
    .onConflictDoNothing()
    .returning();

  return { feeRate: created?.feeRate ?? DEFAULT_FEE_RATE };
}

export async function updateSettings(feeRate: string): Promise<{ feeRate: string }> {
  const normalized = normalizeFeeRate(feeRate);
  if (normalized === null) {
    throw new Error("Stawka prowizji musi być liczbą od 0 do 100.");
  }

  const [row] = await getDb()
    .insert(settings)
    .values({ id: 1, feeRate: normalized, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.id,
      set: { feeRate: normalized, updatedAt: new Date() },
    })
    .returning();

  return { feeRate: row.feeRate };
}
