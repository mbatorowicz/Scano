/**
 * Zapytania o wypłaty i o saldo. Saldo stoi tutaj, a nie przy fakturach, bo
 * pyta o nie rozliczenie: ile z zarobionego jeszcze nie trafiło do mnie.
 */
import { desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/index";
import {
  invoices,
  settlements,
  type NewSettlement,
  type Settlement,
} from "@/lib/db/schema";
import { minorUnitsToDecimal, toMinorUnits } from "@/lib/money";

/** Kolumny, które ustawia aplikacja; `id` i `created_at` dokłada baza. */
export type SettlementRow = Omit<NewSettlement, "id" | "createdAt">;

/** Wypłaty od najnowszej; `id` rozstrzyga kolejność w obrębie jednego dnia. */
export async function listSettlements(): Promise<Settlement[]> {
  return getDb()
    .select()
    .from(settlements)
    .orderBy(desc(settlements.settledOn), desc(settlements.id));
}

export async function getSettlement(id: number): Promise<Settlement | null> {
  const [row] = await getDb()
    .select()
    .from(settlements)
    .where(eq(settlements.id, id))
    .limit(1);
  return row ?? null;
}

export async function insertSettlement(
  values: SettlementRow,
): Promise<Settlement> {
  const [row] = await getDb().insert(settlements).values(values).returning();
  return row;
}

export async function updateSettlementRow(
  id: number,
  values: SettlementRow,
): Promise<Settlement | null> {
  const [row] = await getDb()
    .update(settlements)
    .set(values)
    .where(eq(settlements.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSettlementRow(
  id: number,
): Promise<Settlement | null> {
  const [row] = await getDb()
    .delete(settlements)
    .where(eq(settlements.id, id))
    .returning();
  return row ?? null;
}

export type Balance = {
  /** Suma należności ze wszystkich faktur. */
  earned: string;
  /** Suma wypłat. */
  paid: string;
  /** Różnica; ujemna znaczy, że dostałem z góry. */
  outstanding: string;
};

/**
 * Saldo liczymy zawsze na całości, niezależnie od filtrów listy faktur — to stan
 * konta, a nie widok. Sumy robi baza i oddaje jako tekst, bo `numeric` jest
 * dokładny, a `number` po drodze gubiłby grosze.
 */
export async function getBalance(): Promise<Balance> {
  const db = getDb();

  const [[earnedRow], [paidRow]] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${invoices.payoutAmount}), 0)::text`,
      })
      .from(invoices),
    db
      .select({
        total: sql<string>`coalesce(sum(${settlements.amount}), 0)::text`,
      })
      .from(settlements),
  ]);

  const earned = toMinorUnits(earnedRow?.total ?? "0.00") ?? 0n;
  const paid = toMinorUnits(paidRow?.total ?? "0.00") ?? 0n;

  return {
    earned: minorUnitsToDecimal(earned),
    paid: minorUnitsToDecimal(paid),
    outstanding: minorUnitsToDecimal(earned - paid),
  };
}
