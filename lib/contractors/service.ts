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
import {
  countInvoicesForContractor,
  deleteContractorRow,
  findContractorByMatchKey,
  getContractor,
  insertContractor,
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

  const name = input.name.trim();
  if (name === "") return null;
  return findContractorByMatchKey(nameMatchKey(name));
}

/**
 * Odbiorca (szkoła, urząd) często ma ten sam NIP co gmina-nabywca. Tożsamość
 * bierzemy z nazwy, żeby nie scalić ich w jeden wiersz i nie pokazać gminy
 * tam, gdzie ma być jednostka.
 */
export async function matchExistingRecipient(
  input: ContractorInput,
): Promise<Contractor | null> {
  const name = input.name.trim();
  if (name === "") return null;
  return findContractorByMatchKey(nameMatchKey(name));
}

export async function resolveRecipient(
  input: ContractorInput,
): Promise<Contractor | null> {
  const name = input.name.trim();
  if (name === "") return null;

  const nip = validNip(input.nip);
  const byName = await findContractorByMatchKey(nameMatchKey(name));
  if (byName) {
    if (byName.nip === null && nip !== null) {
      const updated = await updateContractorRow(byName.id, {
        name: byName.name,
        nip,
        matchKey: byName.matchKey,
      });
      if (updated) return updated;
    }
    return byName;
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

    const byName = await findContractorByMatchKey(nameMatchKey(name));
    if (byName !== null && byName.nip === null) {
      const promoted = await updateContractorRow(byName.id, {
        name: byName.name,
        nip,
        matchKey: nipMatchKey(nip),
      });
      if (promoted) return promoted;
    }

    return insertOrReuse({ name, nip, matchKey: nipMatchKey(nip) });
  }

  const byName = await findContractorByMatchKey(nameMatchKey(name));
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
