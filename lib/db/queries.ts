import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";

import { parseAmount } from "@/lib/money";
import { calculatePayout, normalizeCostAmount } from "@/lib/payout";

import { getDb } from "./index";
import { aiUsage, invoices, type Invoice } from "./schema";

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
  /** Cena, jaką sam zapłaciłem; pusta znaczy zero. */
  costAmount?: string | null;
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
  const grossAmount = requireAmount(input.grossAmount, "wartość brutto");

  const costAmount = normalizeCostAmount(input.costAmount);
  if (costAmount === null) throw new InvalidAmountError("cena dla mnie");

  const payoutAmount = calculatePayout(grossAmount, costAmount);
  if (payoutAmount === null) throw new InvalidAmountError("należność dla mnie");

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
      costAmount,
      payoutAmount,
      imagePathname: input.imagePathname ?? null,
    })
    .returning();

  return row;
}

/**
 * Należność liczymy przy każdej edycji od nowa — inaczej po poprawieniu kwoty
 * brutto albo ceny dla mnie w kolumnie zostałaby stara wartość.
 */
export async function updateInvoice(
  id: number,
  input: InvoiceInput,
): Promise<Invoice | null> {
  const current = await getInvoice(id);
  if (current === null) return null;

  const grossAmount = requireAmount(input.grossAmount, "wartość brutto");

  const costAmount = normalizeCostAmount(input.costAmount);
  if (costAmount === null) throw new InvalidAmountError("cena dla mnie");

  const payoutAmount = calculatePayout(grossAmount, costAmount);
  if (payoutAmount === null) throw new InvalidAmountError("należność dla mnie");

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
      costAmount,
      payoutAmount,
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

export type AiUsageInput = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

/**
 * Licznik zużycia nie może przewrócić odczytu — użytkownik ma już dane faktury
 * na ekranie, a nieudany zapis statystyki to nie jego problem.
 */
export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  try {
    await getDb().insert(aiUsage).values({
      model: input.model,
      inputTokens: Math.max(0, Math.round(input.inputTokens)),
      outputTokens: Math.max(0, Math.round(input.outputTokens)),
      totalTokens: Math.max(0, Math.round(input.totalTokens)),
    });
  } catch (cause) {
    console.error("Nie udało się zapisać zużycia AI", cause);
  }
}

export type AiUsageSummary = {
  scans: number;
  totalTokens: number;
  /** Średnia na odczyt — po niej najszybciej widać skutek zmiany ustawień. */
  averageTokens: number;
};

export async function getAiUsageSummary(since: Date): Promise<AiUsageSummary> {
  const [row] = await getDb()
    .select({
      scans: count(),
      totalTokens: sql<number>`coalesce(sum(${aiUsage.totalTokens}), 0)::int`,
    })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since));

  const scans = row?.scans ?? 0;
  const totalTokens = row?.totalTokens ?? 0;

  return {
    scans,
    totalTokens,
    averageTokens: scans === 0 ? 0 : Math.round(totalTokens / scans),
  };
}

/**
 * Zużycie w rozbiciu na modele. Dobowy limit darmowego planu jest liczony
 * osobno dla każdego z nich, więc dopiero taki podział mówi, ile odczytów
 * jeszcze zostało.
 */
export async function getAiUsageByModel(
  since: Date,
): Promise<Array<{ model: string; scans: number }>> {
  return getDb()
    .select({ model: aiUsage.model, scans: count() })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since))
    .groupBy(aiUsage.model)
    .orderBy(aiUsage.model);
}
