/**
 * Po odczycie AI podstawiamy nazwę i NIP ze słownika, gdy firmę już znamy.
 * Cache skanu trzyma surowy wynik modelu — kanonizacja idzie zawsze na świeżo,
 * żeby poprawiona ręcznie nazwa wracała przy kolejnym zdjęciu tej samej firmy.
 *
 * Sprzedawcę zawsze bierzemy jako Peceta: nie ufamy odczytowi z faktury,
 * bo sprzedawca jest jeden, a model częściej myli go z odbiorcą.
 */
import {
  KNOWN_SELLER_NAME,
  KNOWN_SELLER_NIP,
} from "@/lib/contractors/known-seller";
import { matchExistingContractor } from "@/lib/contractors/service";

import type { ExtractedInvoice } from "./normalize";

export type CanonizedInvoice = ExtractedInvoice & {
  sellerContractorId: string | null;
  buyerContractorId: string | null;
};

async function canonizeParty(
  name: string | null,
  nip: string | null,
): Promise<{ name: string | null; nip: string | null; id: string | null }> {
  if ((name === null || name === "") && (nip === null || nip === "")) {
    return { name, nip, id: null };
  }

  const match = await matchExistingContractor({ name: name ?? "", nip });
  if (match === null) return { name, nip, id: null };

  return {
    name: match.name,
    nip: match.nip,
    id: String(match.id),
  };
}

export async function canonizeExtractedInvoice(
  data: ExtractedInvoice,
): Promise<CanonizedInvoice> {
  const [seller, buyer] = await Promise.all([
    canonizeParty(KNOWN_SELLER_NAME, KNOWN_SELLER_NIP),
    canonizeParty(data.buyerName, data.buyerNip),
  ]);

  return {
    ...data,
    sellerName: seller.name ?? KNOWN_SELLER_NAME,
    sellerNip: seller.nip ?? KNOWN_SELLER_NIP,
    sellerContractorId: seller.id,
    buyerName: buyer.name,
    buyerNip: buyer.nip,
    buyerContractorId: buyer.id,
  };
}
