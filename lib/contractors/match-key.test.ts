import { describe, expect, it } from "vitest";

import { contractorMatchKey, normalizeContractorName } from "./match-key";

describe("contractorMatchKey", () => {
  it("rozstrzyga NIP-em, nawet gdy nazwa wygląda zupełnie inaczej", () => {
    expect(contractorMatchKey("F.H.U. Pecet", "824-116-74-09")).toBe(
      "nip:8241167409",
    );
    expect(contractorMatchKey("Pecet Mariusz Szczęsny", "8241167409")).toBe(
      "nip:8241167409",
    );
  });

  it("niepełny NIP traktuje jak brak i wraca do nazwy", () => {
    expect(contractorMatchKey("Gmina Miedzna", "824172")).toBe(
      "name:gmina miedzna",
    );
    expect(contractorMatchKey("Gmina Miedzna", null)).toBe(
      "name:gmina miedzna",
    );
  });

  it("zbija dwa odczyty tej samej firmy bez NIP-u", () => {
    const withDecorations = contractorMatchKey(
      ' F.H.U. "Pecet"  Mariusz Szczęsny ',
      null,
    );
    const plain = contractorMatchKey("FHU Pecet Mariusz Szczesny", "");

    expect(withDecorations).toBe(plain);
  });

  it("nie skleja dwóch firm o wspólnym członie nazwy", () => {
    expect(contractorMatchKey("Kowalski Transport", null)).not.toBe(
      contractorMatchKey("Kowalski Handel", null),
    );
  });
});

describe("normalizeContractorName", () => {
  it("zdejmuje formę prawną", () => {
    expect(normalizeContractorName("Auto-Części Nowak Sp. z o.o.")).toBe(
      "auto czesci nowak",
    );
    expect(
      normalizeContractorName(
        "Auto Części Nowak spółka z ograniczoną odpowiedzialnością",
      ),
    ).toBe("auto czesci nowak");
    expect(normalizeContractorName("Budimex S.A.")).toBe("budimex");
    expect(normalizeContractorName("Nowak i Wspólnicy sp.j.")).toBe(
      "nowak i wspolnicy",
    );
  });

  it("zdejmuje branżowy skrót stojący przed nazwą", () => {
    expect(normalizeContractorName("P.P.H.U. Stolmet")).toBe("stolmet");
    expect(normalizeContractorName("Z.P.H.U. Stolmet")).toBe("stolmet");
  });

  it("zostawia skrót, który jest w środku nazwy", () => {
    expect(normalizeContractorName("Stolmet PHU Nowak")).toBe(
      "stolmet phu nowak",
    );
  });

  it("zdejmuje ogonki, bo raz wyjdą z odczytu, a raz nie", () => {
    expect(normalizeContractorName("Żółty Młyn Łąka")).toBe("zolty mlyn laka");
  });

  it("zbija spacje i interpunkcję", () => {
    expect(normalizeContractorName('  Gmina   "Miedzna"  ')).toBe(
      "gmina miedzna",
    );
  });

  it("nie oddaje pustej nazwy, gdy została z niej sama forma prawna", () => {
    expect(normalizeContractorName("S.A.")).not.toBe("");
  });
});
