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
  const matches = contractors.filter((row) => nameMatchKey(row.name) === key);
  if (matches.length === 0) return null;
  return matches.find((row) => row.nip !== null) ?? matches[0];
}

/**
 * NIP tylko wtedy, gdy należy do jednej firmy. Gmina i szkoła bywają pod
 * tym samym numerem — wtedy zgadywanie podstawiłoby niewłaściwy wiersz.
 */
export function matchContractorByUniqueNip(
  nip: string,
  contractors: readonly ContractorOption[],
): ContractorOption | null {
  const digits = validNip(nip);
  if (digits === null) return null;
  const matches = contractors.filter((row) => row.nip === digits);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Odbiorca: najpierw nazwa (szkoła to nie gmina), a gdy OCR ją zniekształcił
 * i NIP jest jednoznaczny — ten jeden wiersz ze słownika.
 */
export function matchRecipient(
  name: string,
  nip: string,
  contractors: readonly ContractorOption[],
): ContractorOption | null {
  return (
    matchContractorByName(name, contractors) ??
    matchContractorByUniqueNip(nip, contractors)
  );
}

export function matchInvoiceParty(
  party: "seller" | "buyer" | "recipient",
  name: string,
  nip: string,
  contractors: readonly ContractorOption[],
): ContractorOption | null {
  if (party === "recipient") return matchRecipient(name, nip, contractors);
  return (
    matchContractorByNip(nip, contractors) ??
    matchContractorByName(name, contractors)
  );
}

/**
 * Dwa wiersze tej samej firmy: ta sama nazwa i NIP, który da się pogodzić.
 * Różne NIP-y przy tej samej nazwie zostawiamy — to dwie spółki.
 */
export function uniqueContractors<T extends ContractorOption>(
  contractors: readonly T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const row of contractors) {
    const key = nameMatchKey(row.name);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const kept = new Set<number>();
  for (const group of groups.values()) {
    const nips = new Set(
      group.map((row) => row.nip).filter((nip): nip is string => nip !== null),
    );
    if (nips.size > 1) {
      for (const row of group) kept.add(row.id);
      continue;
    }
    const preferred = group.find((row) => row.nip !== null) ?? group[0];
    kept.add(preferred.id);
  }

  return contractors.filter((row) => kept.has(row.id));
}

export function filterContractorSuggestions(
  query: string,
  contractors: readonly ContractorOption[],
): ContractorOption[] {
  const unique = uniqueContractors(contractors);
  const trimmed = query.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  if (trimmed === "") return unique;

  return unique.filter((row) => {
    if (row.name.toLowerCase().includes(trimmed)) return true;
    return digits.length > 0 && (row.nip ?? "").includes(digits);
  });
}
