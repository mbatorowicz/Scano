/**
 * Reguły wypłaty: kwota musi dać się odczytać, a puste pole notatki to brak
 * notatki, nie pusty tekst w bazie.
 */
import type { Settlement } from "@/lib/db/schema";
import { requireAmount } from "@/lib/money";

import {
  deleteSettlementRow,
  insertSettlement,
  updateSettlementRow,
  type SettlementRow,
} from "./repository";

export type SettlementInput = {
  /** Data wypłaty w formacie ISO (`2026-08-12`). */
  settledOn: string;
  amount: string;
  note?: string | null;
};

function toRow(input: SettlementInput): SettlementRow {
  const note = input.note?.trim();

  return {
    settledOn: input.settledOn,
    amount: requireAmount(input.amount, "kwota wypłaty"),
    note: note ? note : null,
  };
}

export async function createSettlement(
  input: SettlementInput,
): Promise<Settlement> {
  return insertSettlement(toRow(input));
}

export async function updateSettlement(
  id: number,
  input: SettlementInput,
): Promise<Settlement | null> {
  return updateSettlementRow(id, toRow(input));
}

export async function deleteSettlement(
  id: number,
): Promise<Settlement | null> {
  return deleteSettlementRow(id);
}
