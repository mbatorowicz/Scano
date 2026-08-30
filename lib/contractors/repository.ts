/**
 * Zapytania o kontrahentów i nic więcej: żadnego rozpoznawania tożsamości
 * ani reguł, kiedy wolno usunąć firmę. To liczy `service.ts`.
 */
import { eq, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/index";
import {
  contractors,
  invoices,
  type Contractor,
  type NewContractor,
} from "@/lib/db/schema";

/** Kolumny, które ustawia aplikacja; `id` i `created_at` dokłada baza. */
export type ContractorRow = Omit<NewContractor, "id" | "createdAt">;

export type ContractorWithUsage = Contractor & {
  invoiceCount: number;
  recipientCount: number;
};

export async function listContractors(): Promise<ContractorWithUsage[]> {
  const rows = await getDb()
    .select({
      id: contractors.id,
      name: contractors.name,
      nip: contractors.nip,
      matchKey: contractors.matchKey,
      createdAt: contractors.createdAt,
      invoiceCount: sql<number>`cast((
        select count(*) from ${invoices}
        where ${invoices.sellerId} = ${contractors.id}
           or ${invoices.buyerId} = ${contractors.id}
           or ${invoices.recipientId} = ${contractors.id}
      ) as integer)`,
      recipientCount: sql<number>`cast((
        select count(*) from ${invoices}
        where ${invoices.recipientId} = ${contractors.id}
      ) as integer)`,
    })
    .from(contractors)
    .orderBy(contractors.name);

  return rows
    .map((row) => ({
      ...row,
      invoiceCount: Number(row.invoiceCount),
      recipientCount: Number(row.recipientCount),
    }))
    .sort(
      (left, right) =>
        right.invoiceCount - left.invoiceCount ||
        left.name.localeCompare(right.name, "pl"),
    );
}

export async function getContractor(id: number): Promise<Contractor | null> {
  const [row] = await getDb()
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1);
  return row ?? null;
}

export async function findContractorByMatchKey(
  matchKey: string,
): Promise<Contractor | null> {
  const [row] = await getDb()
    .select()
    .from(contractors)
    .where(eq(contractors.matchKey, matchKey))
    .limit(1);
  return row ?? null;
}

export async function countInvoicesForContractor(id: number): Promise<number> {
  const [row] = await getDb()
    .select({
      total: sql<number>`cast(count(*) as integer)`,
    })
    .from(invoices)
    .where(
      or(
        eq(invoices.sellerId, id),
        eq(invoices.buyerId, id),
        eq(invoices.recipientId, id),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function insertContractor(
  values: ContractorRow,
): Promise<Contractor> {
  const [row] = await getDb().insert(contractors).values(values).returning();
  return row;
}

export async function updateContractorRow(
  id: number,
  values: ContractorRow,
): Promise<Contractor | null> {
  const [row] = await getDb()
    .update(contractors)
    .set(values)
    .where(eq(contractors.id, id))
    .returning();
  return row ?? null;
}

export async function deleteContractorRow(
  id: number,
): Promise<Contractor | null> {
  const [row] = await getDb()
    .delete(contractors)
    .where(eq(contractors.id, id))
    .returning();
  return row ?? null;
}
