/**
 * Zapytania o licznik zużycia modelu. Okna czasowe wyznacza `service.ts` —
 * tutaj są już gotowymi granicami.
 */
import { count, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/index";
import { aiUsage, type NewAiUsage } from "@/lib/db/schema";

export type AiUsageRow = Omit<NewAiUsage, "id" | "createdAt">;

export async function insertAiUsage(values: AiUsageRow): Promise<void> {
  await getDb().insert(aiUsage).values(values);
}

export type AiUsageTotals = {
  scans: number;
  totalTokens: number;
};

export async function countAiUsageSince(since: Date): Promise<AiUsageTotals> {
  const [row] = await getDb()
    .select({
      scans: count(),
      totalTokens: sql<number>`coalesce(sum(${aiUsage.totalTokens}), 0)::int`,
    })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since));

  return {
    scans: row?.scans ?? 0,
    totalTokens: row?.totalTokens ?? 0,
  };
}

export async function countAiUsageByModelSince(
  since: Date,
): Promise<Array<{ model: string; scans: number }>> {
  return getDb()
    .select({ model: aiUsage.model, scans: count() })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since))
    .groupBy(aiUsage.model)
    .orderBy(aiUsage.model);
}
