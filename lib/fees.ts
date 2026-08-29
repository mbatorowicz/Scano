import { minorUnitsToDecimal, toMinorUnits } from "@/lib/money";

/** Stawka prowizji, gdy w bazie jeszcze nic nie ustawiono. */
export const DEFAULT_FEE_RATE = "5.00";

export const MAX_FEE_RATE = "100.00";

const MAX_FEE_RATE_HUNDREDTHS = 10_000n;

/**
 * Prowizja to procent od wartości brutto, zaokrąglony do pełnego grosza
 * (połówki w górę). Liczymy w `bigint` na groszach i setnych częściach procenta,
 * więc wynik nie zależy od tego, jak duża jest kwota.
 */
export function calculateFee(
  grossAmount: string | null | undefined,
  feeRate: string | null | undefined,
): string | null {
  const grossMinorUnits = toMinorUnits(grossAmount);
  const rateHundredths = toMinorUnits(feeRate);

  if (grossMinorUnits === null || rateHundredths === null) return null;
  if (grossMinorUnits < 0n || rateHundredths < 0n) return null;

  // brutto[gr] * stawka[setne %] / 10000, bo procent to /100 i stawka jest /100.
  const numerator = grossMinorUnits * rateHundredths;
  return minorUnitsToDecimal((numerator + 5000n) / 10000n);
}

/** Sprawdza stawkę wpisaną w ustawieniach: nieujemna i nie wyższa niż 100%. */
export function isValidFeeRate(feeRate: string | null | undefined): boolean {
  const rateHundredths = toMinorUnits(feeRate);
  if (rateHundredths === null) return false;
  return rateHundredths >= 0n && rateHundredths <= MAX_FEE_RATE_HUNDREDTHS;
}
