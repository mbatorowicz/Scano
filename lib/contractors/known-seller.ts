/**
 * Jedyny sprzedawca w tej aplikacji. Faktury Peceta wymieniają też odbiorcę
 * (urząd, szkoła), ale fakturę wiążemy z nabywcą — sprzedawcy nie odczytujemy
 * za każdym razem, tylko podstawiamy tego, którego już znamy.
 */
import type { ContractorOption } from "./form";
import {
  matchContractorByName,
  matchContractorByNip,
} from "./match-local";

export const KNOWN_SELLER_NAME = 'F.H.U. "Pecet" Mariusz Szczęsny';
export const KNOWN_SELLER_NIP = "8241167409";

export type KnownSellerFields = {
  sellerName: string;
  sellerNip: string;
  sellerContractorId: string;
};

/** Wiersz z bazy, gdy Pecet już tam jest — wtedy bierzemy poprawioną nazwę. */
export function matchKnownSeller(
  contractors: readonly ContractorOption[],
): ContractorOption | null {
  return (
    matchContractorByNip(KNOWN_SELLER_NIP, contractors) ??
    matchContractorByName(KNOWN_SELLER_NAME, contractors)
  );
}

export function knownSellerFormValues(
  contractors: readonly ContractorOption[] = [],
): KnownSellerFields {
  const match = matchKnownSeller(contractors);
  return {
    sellerName: match?.name ?? KNOWN_SELLER_NAME,
    sellerNip: match?.nip ?? KNOWN_SELLER_NIP,
    sellerContractorId: match ? String(match.id) : "",
  };
}
