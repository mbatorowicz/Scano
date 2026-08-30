import { describe, expect, it } from "vitest";

import type { ContractorOption } from "./form";
import {
  KNOWN_SELLER_NAME,
  KNOWN_SELLER_NIP,
  knownSellerFormValues,
  matchKnownSeller,
} from "./known-seller";

const PECET: ContractorOption = {
  id: 7,
  name: 'P.H.U. "Pecet" Mariusz Szczęsny',
  nip: KNOWN_SELLER_NIP,
};

const BUYER: ContractorOption = {
  id: 3,
  name: "Gmina Miedzna",
  nip: "8241723514",
};

describe("matchKnownSeller", () => {
  it("rozpoznaje Peceta po NIP-ie, nawet gdy nazwa w bazie jest inna", () => {
    expect(matchKnownSeller([BUYER, PECET])).toEqual(PECET);
  });

  it("rozpoznaje Peceta po nazwie, gdy NIP-u jeszcze nie ma", () => {
    const nameless = { id: 2, name: KNOWN_SELLER_NAME, nip: null };
    expect(matchKnownSeller([BUYER, nameless])).toEqual(nameless);
  });

  it("nie myli nabywcy ze sprzedawcą", () => {
    expect(matchKnownSeller([BUYER])).toBeNull();
  });
});

describe("knownSellerFormValues", () => {
  it("podstawia nazwę i id z bazy, gdy Pecet już tam jest", () => {
    expect(knownSellerFormValues([PECET])).toEqual({
      sellerName: PECET.name,
      sellerNip: KNOWN_SELLER_NIP,
      sellerContractorId: "7",
    });
  });

  it("zostawia kanoniczną nazwę, gdy słownik jest pusty", () => {
    expect(knownSellerFormValues([])).toEqual({
      sellerName: KNOWN_SELLER_NAME,
      sellerNip: KNOWN_SELLER_NIP,
      sellerContractorId: "",
    });
  });
});
