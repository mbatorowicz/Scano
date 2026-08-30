import { describe, expect, it } from "vitest";

import { calculatePayout, normalizeCostAmount } from "@/lib/payout";

/**
 * Kwoty z arkusza, który aplikacja zastąpiła — muszą wychodzić co do grosza,
 * inaczej rozliczenie przestaje się zgadzać z tym, co było liczone ręcznie.
 */
describe("calculatePayout", () => {
  it("liczy należność tak jak arkusz", () => {
    expect(calculatePayout("750.00", "700.00")).toBe("34.16");
    expect(calculatePayout("1107.00", "0.00")).toBe("756.30");
    expect(calculatePayout("735.00", "635.00")).toBe("68.32");
    expect(calculatePayout("330.00", "290.00")).toBe("27.33");
    expect(calculatePayout("1640.00", "1550.00")).toBe("61.49");
  });

  it("puste pole ceny liczy się jak zero", () => {
    expect(calculatePayout("1107.00", "")).toBe("756.30");
    expect(calculatePayout("1107.00", null)).toBe("756.30");
    expect(calculatePayout("1107.00", undefined)).toBe("756.30");
  });

  it("cena wyższa niż brutto daje stratę, nie błąd", () => {
    expect(calculatePayout("700.00", "750.00")).toBe("-34.16");
  });

  it("brak marży daje zero", () => {
    expect(calculatePayout("750.00", "750.00")).toBe("0.00");
  });

  it("przyjmuje kwoty w zapisie z formularza", () => {
    expect(calculatePayout("750,00", "700,00")).toBe("34.16");
  });

  it("zwraca null, gdy którejś kwoty nie da się odczytać", () => {
    expect(calculatePayout(null, "700.00")).toBeNull();
    expect(calculatePayout("750.00", "mniej więcej siedemset")).toBeNull();
  });
});

describe("normalizeCostAmount", () => {
  it("puste pole to zero", () => {
    expect(normalizeCostAmount("")).toBe("0.00");
    expect(normalizeCostAmount(null)).toBe("0.00");
    expect(normalizeCostAmount("   ")).toBe("0.00");
  });

  it("kwotę sprowadza do zapisu bazy", () => {
    expect(normalizeCostAmount("700,00")).toBe("700.00");
  });

  it("kwoty nie do odczytania nie zamienia na zero", () => {
    expect(normalizeCostAmount("brak")).toBeNull();
  });
});
