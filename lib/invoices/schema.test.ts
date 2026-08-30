import { describe, expect, it } from "vitest";

import { fieldErrors } from "@/lib/forms/form-state";

import type { InvoiceFieldName } from "./form";
import { invoiceFormSchema, readInvoiceFormValues } from "./schema";

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value);
  }
  return formData;
}

/** Formularz wypełniony tak, jak przychodzi z przeglądarki: ze spacjami i przecinkami. */
const FILLED = {
  invoiceNumber: " 0350/2026 ",
  issueDate: "2026-08-12",
  sellerName: ' F.H.U. "Pecet" Mariusz Szczęsny ',
  sellerNip: "824-116-74-09",
  buyerName: "Gmina Miedzna",
  buyerNip: "8241723514",
  grossAmount: "750,00 zł",
  netAmount: "609,76",
  vatAmount: "140,24",
  costAmount: "700,00",
};

function parse(fields: Record<string, string>) {
  return invoiceFormSchema.safeParse(readInvoiceFormValues(form(fields)));
}

function errorsFor(fields: Record<string, string>) {
  const parsed = parse(fields);
  if (parsed.success) throw new Error("Formularz miał zostać odrzucony.");
  return fieldErrors<InvoiceFieldName>(parsed.error);
}

describe("invoiceFormSchema", () => {
  it("sprowadza wypełniony formularz do zapisu bazy", () => {
    const parsed = parse(FILLED);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.invoiceNumber).toBe("0350/2026");
    expect(parsed.data.sellerName).toBe('F.H.U. "Pecet" Mariusz Szczęsny');
    expect(parsed.data.sellerNip).toBe("8241167409");
    expect(parsed.data.grossAmount).toBe("750.00");
    expect(parsed.data.netAmount).toBe("609.76");
    expect(parsed.data.costAmount).toBe("700.00");
  });

  it("wskazuje brakujące pola wymagane", () => {
    const errors = errorsFor({ netAmount: "", vatAmount: "", costAmount: "" });

    expect(errors.invoiceNumber).toBe("Podaj numer faktury.");
    expect(errors.issueDate).toBe("Podaj datę wystawienia.");
    expect(errors.sellerName).toBe("Podaj nazwę sprzedawcy.");
    expect(errors.buyerName).toBe("Podaj nazwę nabywcy.");
    expect(errors.grossAmount).toBe("Podaj wartość brutto.");
  });

  it("puste pola opcjonalne zostają pustką, nie zerem", () => {
    const parsed = parse({
      ...FILLED,
      netAmount: "",
      vatAmount: "",
      costAmount: "",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.netAmount).toBeNull();
    expect(parsed.data.vatAmount).toBeNull();
    expect(parsed.data.costAmount).toBeNull();
  });

  it("puste pola opcjonalne nie zgłaszają błędu", () => {
    const errors = errorsFor({ netAmount: "", vatAmount: "", costAmount: "" });

    expect(errors.netAmount).toBeUndefined();
    expect(errors.vatAmount).toBeUndefined();
    expect(errors.costAmount).toBeUndefined();
    expect(errors.sellerNip).toBeUndefined();
  });

  it("odrzuca kwotę, której nie da się odczytać", () => {
    const errors = errorsFor({
      ...FILLED,
      grossAmount: "mniej więcej tysiąc",
    });
    expect(errors.grossAmount).toBe(
      "Nie rozumiem tej kwoty. Wpisz ją tak: 1234,56.",
    );
  });

  it("odrzuca datę, której nie ma w kalendarzu", () => {
    const errors = errorsFor({ ...FILLED, issueDate: "2026-02-30" });
    expect(errors.issueDate).toBe("Ta data nie wygląda poprawnie.");
  });

  it("odrzuca NIP o innej długości niż dziesięć cyfr", () => {
    const errors = errorsFor({ ...FILLED, buyerNip: "824172" });
    expect(errors.buyerNip).toBe("NIP składa się z dziesięciu cyfr.");
  });

  it("pilnuje długości pól tekstowych", () => {
    const errors = errorsFor({ ...FILLED, sellerName: "x".repeat(201) });
    expect(errors.sellerName).toBe("Ta wartość jest za długa.");
  });
});

describe("readInvoiceFormValues", () => {
  it("przycina wartości i uzupełnia pola, których nie przysłano", () => {
    const values = readInvoiceFormValues(form({ invoiceNumber: "  7/2026  " }));

    expect(values.invoiceNumber).toBe("7/2026");
    expect(values.sellerName).toBe("");
    expect(values.costAmount).toBe("");
  });
});
