import { describe, expect, it } from "vitest";

import { fieldErrors } from "@/lib/forms/form-state";

import type { SettlementFieldName } from "./form";
import { readSettlementFormValues, settlementFormSchema } from "./schema";

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value);
  }
  return formData;
}

function parse(fields: Record<string, string>) {
  return settlementFormSchema.safeParse(readSettlementFormValues(form(fields)));
}

function errorsFor(fields: Record<string, string>) {
  const parsed = parse(fields);
  if (parsed.success) throw new Error("Formularz miał zostać odrzucony.");
  return fieldErrors<SettlementFieldName>(parsed.error);
}

describe("settlementFormSchema", () => {
  it("sprowadza wypełniony formularz do zapisu bazy", () => {
    const parsed = parse({
      settledOn: "2026-08-12",
      amount: "1 000,00 zł",
      note: " gotówka ",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.settledOn).toBe("2026-08-12");
    expect(parsed.data.amount).toBe("1000.00");
    expect(parsed.data.note).toBe("gotówka");
  });

  it("pusta notatka zostaje pustką, nie pustym tekstem", () => {
    const parsed = parse({ settledOn: "2026-08-12", amount: "700", note: "" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.note).toBeNull();
  });

  it("wskazuje brakujące pola", () => {
    const errors = errorsFor({ note: "" });

    expect(errors.settledOn).toBe("Podaj datę wypłaty.");
    expect(errors.amount).toBe("Podaj kwotę wypłaty.");
  });

  it("odrzuca wypłatę na zero i na minus", () => {
    expect(errorsFor({ settledOn: "2026-08-12", amount: "0" }).amount).toBe(
      "Kwota wypłaty musi być większa od zera.",
    );
    expect(errorsFor({ settledOn: "2026-08-12", amount: "-100" }).amount).toBe(
      "Kwota wypłaty musi być większa od zera.",
    );
  });

  it("odrzuca kwotę, której nie da się odczytać", () => {
    const errors = errorsFor({ settledOn: "2026-08-12", amount: "tysiąc" });
    expect(errors.amount).toBe(
      "Nie rozumiem tej kwoty. Wpisz ją tak: 1000,00.",
    );
  });

  it("odrzuca datę, której nie ma w kalendarzu", () => {
    const errors = errorsFor({ settledOn: "2026-02-30", amount: "700" });
    expect(errors.settledOn).toBe("Ta data nie wygląda poprawnie.");
  });

  it("pilnuje długości notatki", () => {
    const errors = errorsFor({
      settledOn: "2026-08-12",
      amount: "700",
      note: "x".repeat(201),
    });
    expect(errors.note).toBe("Ta notatka jest za długa.");
  });
});
