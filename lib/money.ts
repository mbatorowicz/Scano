/**
 * Kwoty krążą po aplikacji jako stringi dziesiętne z dwoma miejscami ("1234.56").
 * Wszystkie działania robimy na groszach w `bigint`, bo `number` przy sumowaniu
 * kilkuset faktur zaczyna gubić grosze.
 */

/** Największa kwota, jaka zmieści się w kolumnie `numeric(12,2)`. */
const MAX_INTEGER_DIGITS = 10;

const WHITESPACE = /[\s\u00a0\u202f]/g;
const CURRENCY = /z[łl]|pln/gi;

/**
 * Zamienia kwotę zapisaną po ludzku na string dziesiętny z dwoma miejscami.
 * Radzi sobie z `"750,00"`, `"1 234,56"`, `"1.234,56"` i `"750,00 zł"`.
 * Zwraca `null`, gdy tekstu nie da się odczytać jako kwoty — wtedy pole
 * zostaje puste do ręcznego uzupełnienia zamiast trafić do bazy jako zero.
 */
export function parseAmount(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;

  let text = input.replace(CURRENCY, "").replace(WHITESPACE, "");
  if (text.length === 0) return null;

  let negative = false;
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }

  if (!/^[\d.,]+$/.test(text)) return null;

  const separatorIndex = decimalSeparatorIndex(text);
  const integerDigits = (
    separatorIndex === -1 ? text : text.slice(0, separatorIndex)
  ).replace(/[.,]/g, "");
  const fractionDigits =
    separatorIndex === -1 ? "" : text.slice(separatorIndex + 1);

  if (!/^\d*$/.test(integerDigits) || !/^\d*$/.test(fractionDigits)) return null;
  if (integerDigits.length === 0 && fractionDigits.length === 0) return null;
  if (integerDigits.length > MAX_INTEGER_DIGITS) return null;

  const minorUnits = roundToMinorUnits(integerDigits || "0", fractionDigits);
  return minorUnitsToDecimal(negative ? -minorUnits : minorUnits);
}

/**
 * Który znak jest separatorem dziesiętnym, a które tylko rozdzielają tysiące.
 * Gdy w tekście są oba znaki, dziesiętny jest ten dalej z tyłu. Sama kropka jest
 * dwuznaczna: po polsku rozdziela tysiące (`1.234`), ale Gemini często zwraca
 * `750.00`, więc uznajemy ją za dziesiętną tylko gdy jest jedna i kończy kwotę
 * najwyżej dwiema cyframi.
 */
function decimalSeparatorIndex(text: string): number {
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma !== -1) {
    return lastComma > lastDot ? lastComma : lastDot;
  }
  if (lastDot === -1) return -1;

  const isOnlyDot = text.indexOf(".") === lastDot;
  return isOnlyDot && /^\.\d{1,2}$/.test(text.slice(lastDot)) ? lastDot : -1;
}

/** Grosze z części całkowitej i dziesiętnej, z zaokrągleniem połówek w górę. */
function roundToMinorUnits(integerDigits: string, fractionDigits: string): bigint {
  const padded = `${fractionDigits}00`.slice(0, 3);
  const base = BigInt(integerDigits) * 100n + BigInt(padded.slice(0, 2));
  return Number(padded[2]) >= 5 ? base + 1n : base;
}

/** `"1234.56"` na `123456n`. Zwraca `null` dla wartości, której nie da się odczytać. */
export function toMinorUnits(value: string | null | undefined): bigint | null {
  if (typeof value !== "string") return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (match) {
    const [, sign, integerDigits, fractionDigits = ""] = match;
    const minorUnits =
      BigInt(integerDigits) * 100n + BigInt(`${fractionDigits}00`.slice(0, 2));
    return sign === "-" ? -minorUnits : minorUnits;
  }

  // Wartość w innym zapisie (np. wpisana ręcznie w formularzu) — normalizujemy raz
  // i wracamy tu z postacią, którą łapie regex powyżej.
  const normalized = parseAmount(value);
  return normalized === null ? null : toMinorUnits(normalized);
}

/** `123456n` na `"1234.56"` — postać, w jakiej kwota idzie do bazy. */
export function minorUnitsToDecimal(minorUnits: bigint): string {
  const negative = minorUnits < 0n;
  const digits = (negative ? -minorUnits : minorUnits).toString().padStart(3, "0");
  const integerPart = digits.slice(0, -2);
  const fractionPart = digits.slice(-2);
  return `${negative ? "-" : ""}${integerPart}.${fractionPart}`;
}

/** Suma kwot bez gubienia groszy. Wartości nieczytelne pomijamy. */
export function sumAmounts(values: Array<string | null | undefined>): string {
  let total = 0n;
  for (const value of values) {
    total += toMinorUnits(value) ?? 0n;
  }
  return minorUnitsToDecimal(total);
}

/** `"1234.56"` na `"1 234,56"` — zapis polski, ze spacją nierozdzielającą tysięcy. */
export function formatAmount(value: string | null | undefined): string {
  const minorUnits = toMinorUnits(value);
  if (minorUnits === null) return "—";

  const [integerPart, fractionPart] = minorUnitsToDecimal(
    minorUnits < 0n ? -minorUnits : minorUnits,
  ).split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return `${minorUnits < 0n ? "-" : ""}${grouped},${fractionPart}`;
}

export function formatCurrency(value: string | null | undefined): string {
  const formatted = formatAmount(value);
  return formatted === "—" ? formatted : `${formatted}\u00a0zł`;
}