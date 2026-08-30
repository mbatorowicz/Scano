import { minorUnitsToDecimal, toMinorUnits } from "@/lib/money";

export const VAT_PERCENT = 23;
export const INCOME_TAX_PERCENT = 19;

/**
 * Z marży schodzi najpierw VAT (1,23), potem podatek dochodowy (1,19), czyli
 * razem 1,4637. Trzymamy to jako jeden dzielnik w dziesięciotysięcznych, żeby
 * nie zaokrąglać dwa razy — arkusz też liczy jednym przejściem.
 */
const DIVISOR = 14_637n;

/**
 * Należność dla mnie: marża między brutto z faktury a ceną, jaką sam zapłaciłem,
 * po podatkach. Liczymy w `bigint` na groszach, połówki grosza w górę.
 * Cena wyższa niż brutto daje wynik ujemny — to strata, nie błąd.
 */
export function calculatePayout(
  grossAmount: string | null | undefined,
  costAmount: string | null | undefined,
): string | null {
  const grossMinorUnits = toMinorUnits(grossAmount);
  if (grossMinorUnits === null) return null;

  const costMinorUnits = isBlank(costAmount) ? 0n : toMinorUnits(costAmount);
  if (costMinorUnits === null) return null;

  const margin = grossMinorUnits - costMinorUnits;
  const magnitude = margin < 0n ? -margin : margin;
  // Połówki w górę bez ułamka w dzielniku: licznik i dzielnik razy dwa.
  const payout = (magnitude * 20_000n + DIVISOR) / (DIVISOR * 2n);

  return minorUnitsToDecimal(margin < 0n ? -payout : payout);
}

/** Puste pole „cena dla mnie" znaczy zero, a nie kwotę nie do odczytania. */
function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

/** Kwota do zapisu w kolumnie `cost_amount`; puste pole to 0,00. */
export function normalizeCostAmount(
  value: string | null | undefined,
): string | null {
  if (isBlank(value)) return "0.00";
  const minorUnits = toMinorUnits(value);
  return minorUnits === null ? null : minorUnitsToDecimal(minorUnits);
}
