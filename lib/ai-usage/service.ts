/**
 * Licznik zużycia modelu. Bez niego nie da się powiedzieć, czy zmiana ustawień
 * Gemini rzeczywiście coś oszczędziła — a przy darmowym limicie z AI Studio to
 * różnica między „działa" a „wróć za minutę".
 */
import { FREE_TIER_DAILY_LIMIT } from "@/lib/config";
import { startOfDay, startOfMonth } from "@/lib/dates";

import {
  countAiUsageByModelSince,
  countAiUsageSince,
  insertAiUsage,
} from "./repository";

export type AiUsageInput = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

/**
 * Zapis licznika nie może przewrócić odczytu — użytkownik ma już dane faktury
 * na ekranie, a nieudany zapis statystyki to nie jego problem.
 */
export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  try {
    await insertAiUsage({
      model: input.model,
      inputTokens: tokenCount(input.inputTokens),
      outputTokens: tokenCount(input.outputTokens),
      totalTokens: tokenCount(input.totalTokens),
    });
  } catch (cause) {
    console.error("Nie udało się zapisać zużycia AI", cause);
  }
}

/** Kolumna jest liczbą całkowitą nieujemną; SDK czasem nie poda nic. */
function tokenCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export type AiUsageSummary = {
  scans: number;
  totalTokens: number;
  /** Średnia na odczyt — po niej najszybciej widać skutek zmiany ustawień. */
  averageTokens: number;
};

export async function getMonthlyAiUsage(
  now = new Date(),
): Promise<AiUsageSummary> {
  const { scans, totalTokens } = await countAiUsageSince(startOfMonth(now));

  return {
    scans,
    totalTokens,
    averageTokens: scans === 0 ? 0 : Math.round(totalTokens / scans),
  };
}

export type ModelUsage = {
  model: string;
  scans: number;
  limit: number;
  /** Ile odczytów zostało do końca doby; zero znaczy „wróć jutro". */
  remaining: number;
};

/**
 * Zużycie w rozbiciu na modele. Dobowy limit darmowego planu jest liczony
 * osobno dla każdego z nich, więc dopiero taki podział mówi, ile odczytów
 * jeszcze zostało.
 */
export async function getTodayModelUsage(
  now = new Date(),
): Promise<ModelUsage[]> {
  const rows = await countAiUsageByModelSince(startOfDay(now));

  return rows.map((row) => ({
    model: row.model,
    scans: row.scans,
    limit: FREE_TIER_DAILY_LIMIT,
    remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - row.scans),
  }));
}
