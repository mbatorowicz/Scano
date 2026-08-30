/**
 * Liczby, które da się zmienić bez czytania kodu, który z nich korzysta:
 * stawki podatków, limity magazynu i modelu, kwoty podpowiadane w formularzu.
 * Reszta stałych zostaje przy swojej logice, bo bez niej nic nie znaczy.
 */

/** Stawka VAT, o którą schodzi marża przed wyliczeniem należności. */
export const VAT_PERCENT = 23;

/** Podatek dochodowy pobierany od marży po VAT. */
export const INCOME_TAX_PERCENT = 19;

/** Ile odczytów na dobę daje darmowy plan AI Studio dla jednego modelu. */
export const FREE_TIER_DAILY_LIMIT = 20;

/** Gemini czyta fakturę kilka, czasem kilkanaście sekund; dłużej znaczy, że coś się zawiesiło. */
export const EXTRACTION_TIMEOUT_MS = 45_000;

/**
 * Zero ponowień. Limit dobowy liczy zapytania, więc cicha powtórka zabiera
 * odczyt, którego użytkownik nawet nie zobaczył — a robi to akurat wtedy, gdy
 * model odpowiada wolno albo się dławi. Powtórka zostaje decyzją użytkownika:
 * widzi błąd i sam wybiera, czy poświęcić na to kolejną próbę.
 */
export const EXTRACTION_MAX_RETRIES = 0;

/** Jak długo pamiętamy odczyt tego samego zdjęcia, żeby nie płacić za niego dwa razy. */
export const SCAN_CACHE_TTL_MS = 15 * 60_000;

export const SCAN_CACHE_MAX_ENTRIES = 8;

/** Zdjęcie z telefonu po kompresji ma zwykle poniżej 1 MB; 10 MB to zapas na oryginały. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Dłuższy bok po skalowaniu. Tekst faktury zostaje czytelny, plik schodzi poniżej megabajta. */
export const IMAGE_MAX_EDGE = 1600;

export const IMAGE_QUALITY = 0.82;

/** Kwoty rozliczane najczęściej — jedno dotknięcie zamiast wklepywania na telefonie. */
export const QUICK_SETTLEMENT_AMOUNTS = ["700", "1000", "1300", "1500"] as const;
