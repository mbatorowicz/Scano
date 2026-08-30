/**
 * Doprowadzenie odpowiedzi modelu do postaci, jakiej oczekuje formularz i baza:
 * kwoty w zapisie dziesiętnym, daty w ISO, NIP jako same cyfry, a wszystko,
 * czego nie da się użyć, jako `null`.
 */
import { isIsoDate } from "@/lib/dates";
import { parseAmount, sumAmounts, toMinorUnits } from "@/lib/money";
import { validNip } from "@/lib/nip";

import type { RawExtraction } from "./output-schema";

export type ExtractedInvoice = {
  invoiceNumber: string | null;
  issueDate: string | null;
  sellerName: string | null;
  sellerNip: string | null;
  buyerName: string | null;
  buyerNip: string | null;
  recipientName: string | null;
  recipientNip: string | null;
  grossAmount: string | null;
  netAmount: string | null;
  vatAmount: string | null;
};

export function normalize(raw: RawExtraction): ExtractedInvoice {
  const netAmount = parseAmount(raw.netAmount);
  const vatAmount = parseAmount(raw.vatAmount);
  let grossAmount = parseAmount(raw.grossAmount);

  // Bez kwoty brutto nie ma z czego policzyć należności, a suma netto i VAT jest
  // tu pewna: to jedyna wartość, jaką wyliczamy zamiast odczytywać.
  if (grossAmount === null && netAmount !== null && vatAmount !== null) {
    grossAmount = sumAmounts([netAmount, vatAmount]);
  }

  return {
    invoiceNumber: text(raw.invoiceNumber),
    issueDate: isoDate(raw.issueDate),
    sellerName: text(raw.sellerName),
    sellerNip: validNip(raw.sellerNip),
    buyerName: text(raw.buyerName),
    buyerNip: validNip(raw.buyerNip),
    recipientName: text(raw.recipientName),
    recipientNip: validNip(raw.recipientNip),
    grossAmount: positive(grossAmount),
    netAmount: positive(netAmount),
    vatAmount: positive(vatAmount),
  };
}

function text(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  // Modele czasem zwracają dosłowne "null" albo "brak" zamiast pustej wartości.
  return /^(null|brak|nie\s?dotyczy|n\/?d)$/i.test(trimmed) ? null : trimmed;
}

function positive(value: string | null): string | null {
  if (value === null) return null;
  const minorUnits = toMinorUnits(value);
  return minorUnits !== null && minorUnits > 0n ? value : null;
}

/** Data w ISO; przyjmujemy też polski zapis `12.08.2026`, gdyby model go zwrócił. */
function isoDate(value: string | null): string | null {
  const trimmed = text(value);
  if (trimmed === null) return null;

  if (isIsoDate(trimmed)) return trimmed;

  const polish = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/.exec(trimmed);
  if (polish) {
    const day = polish[1].padStart(2, "0");
    const month = polish[2].padStart(2, "0");
    const candidate = `${polish[3]}-${month}-${day}`;
    return isIsoDate(candidate) ? candidate : null;
  }

  return null;
}
