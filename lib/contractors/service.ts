/**
 * Reguły kontrahenta: jak rozpoznać, że firma ze skanu to ta, którą już mamy,
 * kiedy wolno zmienić nazwę i kiedy wolno usunąć wiersz.
 */
import type { Contractor } from "@/lib/db/schema";
import { validNip } from "@/lib/nip";

import {
  contractorMatchKey,
  nameMatchKey,
  nipMatchKey,
} from "./match-key";
import { matchRecipient } from "./match-local";
import {
  countInvoicesForContractor,
  deleteContractorRow,
  findContractorByMatchKey,
  getContractor,
  insertContractor,
  listContractorRows,
  repointContractorInvoices,
  updateContractorRow,
  type ContractorRow,
} from "./repository";

export type ContractorInput = {
  name: string;
  nip?: string | null;
};

export class ContractorInUseError extends Error {
  constructor() {
    super("Tego kontrahenta nie można usunąć, bo ma zapisane faktury.");
    this.name = "ContractorInUseError";
  }
}

export class ContractorConflictError extends Error {
  constructor() {
    super("Taki kontrahent jest już w bazie pod inną nazwą.");
    this.name = "ContractorConflictError";
  }
}

function toRow(input: ContractorInput): ContractorRow {
  const name = input.name.trim();
  const nip = validNip(input.nip);
  return {
    name,
    nip,
    matchKey: contractorMatchKey(name, nip),
  };
}

async function insertOrReuse(values: ContractorRow): Promise<Contractor> {
  try {
    return await insertContractor(values);
  } catch (cause) {
    // Wyścig dwóch zapisów tej samej firmy: drugi wraca do wiersza, który
    // zdążył wstać pod tym samym kluczem.
    const existing = await findContractorByMatchKey(values.matchKey);
    if (existing) return existing;
    throw cause;
  }
}

/**
 * Szuka firmy po nazwie wśród wszystkich wierszy — nie tylko tych z kluczem
 * `name:`. Nabywca zapisany pod NIP-em ma inną tożsamość w bazie, ale to
 * wciąż ta sama szkoła, której nie wolno dopisać drugi raz jako odbiorcy.
 */
async function findByNormalizedName(
  name: string,
): Promise<Contractor | null> {
  const trimmed = name.trim();
  if (trimmed === "") return null;

  const matches = (await listContractorRows()).filter(
    (row) => nameMatchKey(row.name) === nameMatchKey(trimmed),
  );
  if (matches.length === 0) return null;
  return preferKeeper(matches);
}

function nipsCompatible(
  existing: string | null,
  incoming: string | null,
): boolean {
  return existing === null || incoming === null || existing === incoming;
}

function preferKeeper(group: readonly Contractor[]): Contractor {
  return (
    group.find((row) => row.matchKey.startsWith("nip:")) ??
    group.find((row) => row.nip !== null) ??
    group.reduce((oldest, row) => (row.id < oldest.id ? row : oldest))
  );
}

/**
 * Szuka firmy, której już nie trzeba dopisywać. NIP wygrywa z nazwą — po
 * poprawnym numerze podstawiamy nazwę z bazy, nawet gdy OCR odczytał ją inaczej.
 */
export async function matchExistingContractor(
  input: ContractorInput,
): Promise<Contractor | null> {
  const nip = validNip(input.nip);
  if (nip) {
    const byNip = await findContractorByMatchKey(nipMatchKey(nip));
    if (byNip) return byNip;
  }

  return findByNormalizedName(input.name);
}

/**
 * Odbiorca (szkoła, urząd) często ma ten sam NIP co gmina-nabywca. Tożsamość
 * bierzemy z nazwy, żeby nie scalić ich w jeden wiersz i nie pokazać gminy
 * tam, gdzie ma być jednostka.
 */
export async function matchExistingRecipient(
  input: ContractorInput,
): Promise<Contractor | null> {
  return matchRecipient(input.name, input.nip ?? "", await listContractorRows());
}

export async function resolveRecipient(
  input: ContractorInput,
): Promise<Contractor | null> {
  const name = input.name.trim();
  if (name === "") return null;

  const nip = validNip(input.nip);
  const existing = matchRecipient(
    name,
    nip ?? "",
    await listContractorRows(),
  );
  if (existing) {
    if (existing.nip === null && nip !== null) {
      const updated = await updateContractorRow(existing.id, {
        name: existing.name,
        nip,
        matchKey: existing.matchKey,
      });
      if (updated) return updated;
    }
    return existing;
  }

  return insertOrReuse({ name, nip, matchKey: nameMatchKey(name) });
}

/**
 * Znajduje kontrahenta albo go dopisuje. Gdy firma była tylko pod nazwą, a teraz
 * przychodzi NIP, podnosimy klucz — nie powstaje drugi wiersz tej samej firmy.
 */
export async function resolveContractor(
  input: ContractorInput,
): Promise<Contractor> {
  const name = input.name.trim();
  const nip = validNip(input.nip);

  if (nip) {
    const byNip = await findContractorByMatchKey(nipMatchKey(nip));
    if (byNip) return byNip;

    const sameName = await findByNormalizedName(name);
    if (sameName !== null && nipsCompatible(sameName.nip, nip)) {
      const promoted = await updateContractorRow(sameName.id, {
        name: sameName.name,
        nip,
        matchKey: nipMatchKey(nip),
      });
      if (promoted) return promoted;
    }

    return insertOrReuse({ name, nip, matchKey: nipMatchKey(nip) });
  }

  const byName = await findByNormalizedName(name);
  if (byName) return byName;

  return insertOrReuse({ name, nip: null, matchKey: nameMatchKey(name) });
}

export async function renameContractor(
  id: number,
  input: ContractorInput,
): Promise<Contractor | null> {
  const current = await getContractor(id);
  if (current === null) return null;

  const values = toRow(input);
  const other = await findContractorByMatchKey(values.matchKey);
  if (other !== null && other.id !== id) {
    throw new ContractorConflictError();
  }

  return updateContractorRow(id, values);
}

export async function deleteContractor(
  id: number,
): Promise<Contractor | null> {
  const current = await getContractor(id);
  if (current === null) return null;

  if ((await countInvoicesForContractor(id)) > 0) {
    throw new ContractorInUseError();
  }

  return deleteContractorRow(id);
}

/**
 * Zbija wiersze tej samej firmy: raz wstała jako odbiorca pod nazwą, raz jako
 * nabywca pod NIP-em. Gminę i szkołę o wspólnym NIP-ie zostawia w spokoju —
 * różnią się nazwą.
 */
export async function collapseDuplicateContractors(): Promise<number> {
  const rows = await listContractorRows();
  const groups = new Map<string, Contractor[]>();
  for (const row of rows) {
    const key = nameMatchKey(row.name);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  let merged = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const nips = new Set(
      group.map((row) => row.nip).filter((nip): nip is string => nip !== null),
    );
    if (nips.size > 1) continue;

    const keep = preferKeeper(group);
    for (const drop of group) {
      if (drop.id === keep.id) continue;
      await mergeContractorInto(keep, drop);
      merged += 1;
    }
  }

  return merged;
}

async function mergeContractorInto(
  keep: Contractor,
  drop: Contractor,
): Promise<void> {
  await repointContractorInvoices(drop.id, keep.id);

  if (keep.nip === null && drop.nip !== null) {
    await updateContractorRow(keep.id, {
      name: keep.name,
      nip: drop.nip,
      matchKey: nipMatchKey(drop.nip),
    });
  }

  await deleteContractorRow(drop.id);
}
