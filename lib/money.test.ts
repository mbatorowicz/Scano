import { describe, expect, it } from "vitest";

import {
  formatAmount,
  formatCurrency,
  minorUnitsToDecimal,
  parseAmount,
  sumAmounts,
  toMinorUnits,
} from "@/lib/money";

/**
 * Kwoty przychodzą od Gemini i z formularza w różnych zapisach, a stąd idą
 * wprost do kolumny `numeric(12,2)` — to najbardziej kruchy kawałek aplikacji.
 */
describe("parseAmount", () => {
  it("czyta polski zapis z przecinkiem", () => {
    expect(parseAmount("750,00")).toBe("750.00");
    expect(parseAmount("750")).toBe("750.00");
  });

  it("radzi sobie z separatorem tysięcy", () => {
    expect(parseAmount("1 234,56")).toBe("1234.56");
    expect(parseAmount("1.234,56")).toBe("1234.56");
    expect(parseAmount("1\u00a0234,56")).toBe("1234.56");
  });

  it("odrzuca symbol waluty", () => {
    expect(parseAmount("1 234,56 zł")).toBe("1234.56");
    expect(parseAmount("750,00 PLN")).toBe("750.00");
  });

  it("kropkę czyta jak separator dziesiętny tylko wtedy, gdy kończy kwotę", () => {
    expect(parseAmount("750.00")).toBe("750.00");
    expect(parseAmount("1.234")).toBe("1234.00");
  });

  it("zaokrągla połówki grosza w górę", () => {
    expect(parseAmount("10,005")).toBe("10.01");
    expect(parseAmount("10,004")).toBe("10.00");
  });

  it("czyta kwoty ujemne", () => {
    expect(parseAmount("-34,16")).toBe("-34.16");
    expect(parseAmount("+34,16")).toBe("34.16");
  });

  it("zwraca null, gdy tekst nie jest kwotą", () => {
    expect(parseAmount("brak danych")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it("odrzuca kwoty, które nie zmieszczą się w numeric(12,2)", () => {
    expect(parseAmount("1234567890,99")).toBe("1234567890.99");
    expect(parseAmount("12345678901,00")).toBeNull();
  });
});

describe("toMinorUnits", () => {
  it("zamienia zapis bazy na grosze", () => {
    expect(toMinorUnits("1234.56")).toBe(123456n);
    expect(toMinorUnits("-34.16")).toBe(-3416n);
  });

  it("przyjmuje też zapis z formularza", () => {
    expect(toMinorUnits("750,00")).toBe(75000n);
  });

  it("zwraca null dla wartości nie do odczytania", () => {
    expect(toMinorUnits("brak")).toBeNull();
    expect(toMinorUnits(null)).toBeNull();
  });
});

describe("minorUnitsToDecimal", () => {
  it("uzupełnia grosze i zero przed przecinkiem", () => {
    expect(minorUnitsToDecimal(0n)).toBe("0.00");
    expect(minorUnitsToDecimal(5n)).toBe("0.05");
    expect(minorUnitsToDecimal(-1n)).toBe("-0.01");
    expect(minorUnitsToDecimal(123456n)).toBe("1234.56");
  });
});

describe("sumAmounts", () => {
  it("nie gubi groszy", () => {
    expect(sumAmounts(["0.01", "0.02", "750.00"])).toBe("750.03");
  });

  it("pomija wartości nie do odczytania", () => {
    expect(sumAmounts(["brak", "10.00", null])).toBe("10.00");
  });

  it("pusta lista daje zero", () => {
    expect(sumAmounts([])).toBe("0.00");
  });
});

describe("formatAmount", () => {
  it("grupuje tysiące spacją nierozdzielającą", () => {
    expect(formatAmount("1234.56")).toBe("1\u00a0234,56");
    expect(formatAmount("1234567.89")).toBe("1\u00a0234\u00a0567,89");
    expect(formatAmount("750.00")).toBe("750,00");
  });

  it("zachowuje znak minus", () => {
    expect(formatAmount("-1234.56")).toBe("-1\u00a0234,56");
  });

  it("brak kwoty pokazuje jako kreskę", () => {
    expect(formatAmount(null)).toBe("—");
    expect(formatAmount("brak")).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("dokłada złotówki", () => {
    expect(formatCurrency("750.00")).toBe("750,00\u00a0zł");
  });

  it("do kreski nie dokłada waluty", () => {
    expect(formatCurrency(null)).toBe("—");
  });
});
