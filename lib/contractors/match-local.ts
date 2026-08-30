/**
 * To samo rozpoznanie co na serwerze, tylko na liście już pobranej do
 * przeglądarki — podpowiedzi i plakietka „z bazy" nie czekają na request.
 */
import { validNip } from "@/lib/nip";

import type { ContractorOption } from "./form";
import { nameMatchKey } from "./match-key";

export function matchContractorByNip(
  nip: string,
  contractors: readonly ContractorOption[],
): ContractorOption | null {
  const digits = validNip(nip);
  if (digits === null) return null;
  return contractors.find((row) => row.nip === digits) ?? null;
}

export function matchContractorByName(
  name: string,
  contractors: readonly ContractorOption[],
): ContractorOption | null {
  const trimmed = name.trim();
  if (trimmed === "") return null;
  const key = nameMatchKey(trimmed);
  return contractors.find((row) => nameMatchKey(row.name) === key) ?? null;
}

export function filterContractorSuggestions(
  query: string,
  contractors: readonly ContractorOption[],
): ContractorOption[] {
  const trimmed = query.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  if (trimmed === "") return [...contractors];

  return contractors.filter((row) => {
    if (row.name.toLowerCase().includes(trimmed)) return true;
    return digits.length > 0 && (row.nip ?? "").includes(digits);
  });
}
