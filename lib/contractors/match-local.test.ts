import { describe, expect, it } from "vitest";

import type { ContractorOption } from "./form";
import {
  filterContractorSuggestions,
  matchContractorByName,
  matchContractorByUniqueNip,
  matchInvoiceParty,
  matchRecipient,
  uniqueContractors,
} from "./match-local";

const SCHOOL_NAME = "SZKOŁA PODSTAWOWA IM. TADEUSZA KOŚCIUSZKI W MIEDZNIE";

const nameKeyed: ContractorOption = {
  id: 5,
  name: SCHOOL_NAME,
  nip: "8241607506",
};

const nipKeyed: ContractorOption = {
  id: 6,
  name: SCHOOL_NAME,
  nip: "8241607506",
};

const gmina: ContractorOption = {
  id: 3,
  name: "Gmina Miedzna",
  nip: "8241723514",
};

describe("matchRecipient", () => {
  it("rozpoznaje szkołę ze słownika po nazwie, nawet gdy stoi pod kluczem NIP", () => {
    expect(matchRecipient(SCHOOL_NAME, "8241607506", [nipKeyed, gmina])).toEqual(
      nipKeyed,
    );
  });

  it("gdy OCR zniekształcił nazwę, a NIP należy do jednej firmy, bierze tę firmę", () => {
    expect(
      matchRecipient("Szkoła w Miedznie", "8241607506", [nipKeyed, gmina]),
    ).toEqual(nipKeyed);
  });

  it("nie zgaduje po NIP-ie, gdy ten sam numer mają dwie firmy", () => {
    const schoolWithGminaNip = { ...nipKeyed, nip: gmina.nip };
    expect(
      matchRecipient("Inna jednostka", gmina.nip ?? "", [
        schoolWithGminaNip,
        gmina,
      ]),
    ).toBeNull();
  });
});

describe("matchInvoiceParty", () => {
  it("przy starcie formularza wiąże odbiorcę ze słownika, choć skan nie podał id", () => {
    expect(
      matchInvoiceParty("recipient", SCHOOL_NAME, "8241607506", [
        nipKeyed,
        gmina,
      ]),
    ).toEqual(nipKeyed);
  });
});

describe("matchContractorByUniqueNip", () => {
  it("oddaje wiersz tylko wtedy, gdy NIP nie jest dzielony", () => {
    expect(matchContractorByUniqueNip("8241607506", [nipKeyed, gmina])).toEqual(
      nipKeyed,
    );
    expect(matchContractorByUniqueNip(gmina.nip ?? "", [nipKeyed, gmina])).toEqual(
      gmina,
    );
  });
});

describe("matchContractorByName", () => {
  it("znajduje firmę zapisaną pod NIP-em, nie tylko pod kluczem nazwy", () => {
    expect(matchContractorByName(SCHOOL_NAME, [nipKeyed, gmina])).toEqual(
      nipKeyed,
    );
  });

  it("woli wiersz z NIP-em, gdy ta sama szkoła stoi dwa razy", () => {
    const withoutNip = { ...nameKeyed, nip: null };
    expect(
      matchContractorByName(
        "Szkoła Podstawowa im. Tadeusza Kosciuszki w Miedznie",
        [withoutNip, nipKeyed],
      ),
    ).toEqual(nipKeyed);
  });
});

describe("uniqueContractors", () => {
  it("zostawia jeden wiersz, gdy nazwa i NIP się zgadzają", () => {
    expect(uniqueContractors([gmina, nameKeyed, nipKeyed])).toEqual([
      gmina,
      nameKeyed,
    ]);
  });

  it("nie skleja dwóch firm o tej samej nazwie i różnych NIP-ach", () => {
    const other: ContractorOption = {
      id: 9,
      name: SCHOOL_NAME,
      nip: "1111111111",
    };
    expect(uniqueContractors([nameKeyed, other])).toEqual([nameKeyed, other]);
  });
});

describe("filterContractorSuggestions", () => {
  it("nie pokazuje dwóch takich samych szkół na liście", () => {
    const suggestions = filterContractorSuggestions("szkoła", [
      nameKeyed,
      nipKeyed,
      gmina,
    ]);
    expect(suggestions).toEqual([nameKeyed]);
  });
});
