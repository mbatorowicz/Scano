/**
 * Tożsamość kontrahenta zapisana jednym ciągiem: po nim poznajemy, że firma ze
 * skanu to ta sama, którą już mamy w bazie. NIP rozstrzyga, bo jest urzędowy —
 * nazwa służy tylko wtedy, gdy NIP-u na fakturze nie ma albo AI go nie odczytało.
 *
 * Klucz liczy się wyłącznie tutaj, żeby skan, zapis faktury i ekran kontrahentów
 * nigdy nie różniły się w ocenie, czy to ta sama firma.
 */
import { validNip } from "@/lib/nip";

/**
 * Ozdoby, które ta sama firma dopisuje raz tak, raz inaczej: forma prawna oraz
 * branżowy skrót przed nazwą. Wzorce dostają tekst złożony już z samych liter,
 * cyfr i pojedynczych spacji, więc „sp. z o.o." trafia tu jako „sp z o o".
 */
const DECORATIONS: readonly RegExp[] = [
  /\bsp(?:olka)?\s+z\s+o\s*o\b/g,
  /\bspolka\s+z\s+ograniczona\s+odpowiedzialnoscia\b/g,
  /\bspolka\s+akcyjna\b/g,
  /\bs\s*a\b/g,
  /\bspolka\s+(?:jawna|komandytowa|cywilna)\b/g,
  /\bsp\s*[jk]\b/g,
  /\bs\s*c\b/g,
  // „P.P.H.U.", „P.H.U.", „F.H.U.", „Z.P.H.U." — stoją zawsze przed nazwą.
  /^(?:z\s*)?(?:p\s*p|p|f)\s*h\s*u\b/g,
];

/**
 * Ogonki spadają z liter, bo to najczęstsza różnica między dwoma odczytami tej
 * samej nazwy: raz wyjdzie „Szczęsny", raz „Szczesny". Dwie różne firmy nie
 * różnią się samym ogonkiem, więc na scaleniu nic nie tracimy.
 */
function foldDiacritics(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      // „ł" nie rozkłada się na literę ze znakiem, więc trzeba ją osobno.
      .replace(/ł/g, "l")
  );
}

/** Nazwa obrana z pisowni: same litery i cyfry, bez ogonków i bez formy prawnej. */
export function normalizeContractorName(name: string): string {
  const plain = foldDiacritics(name.toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const stripped = DECORATIONS.reduce(
    (value, pattern) => value.replace(pattern, " "),
    plain,
  )
    .replace(/\s+/g, " ")
    .trim();

  // Sama forma prawna bez nazwy własnej to nie nazwa — lepiej zostać przy tym,
  // co napisał użytkownik, niż wyprodukować pusty klucz.
  return stripped === "" ? plain : stripped;
}

export function nipMatchKey(nip: string): string {
  return `nip:${nip}`;
}

export function nameMatchKey(name: string): string {
  return `name:${normalizeContractorName(name)}`;
}

/** Ta sama firma po nazwie, niezależnie od ozdób i ogonków. */
export function sameContractorName(left: string, right: string): boolean {
  const a = left.trim();
  const b = right.trim();
  return a !== "" && b !== "" && nameMatchKey(a) === nameMatchKey(b);
}

/**
 * Klucz dla firmy o podanej nazwie i NIP-ie. NIP inny niż dziesięciocyfrowy
 * traktujemy jak brak — połowa numeru z nieudanego odczytu byłaby gorszym
 * kluczem niż nazwa.
 */
export function contractorMatchKey(
  name: string,
  nip?: string | null,
): string {
  const digits = validNip(nip);
  return digits === null ? nameMatchKey(name) : nipMatchKey(digits);
}
