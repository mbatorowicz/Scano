/**
 * Porównanie kosztu odczytu przy różnych ustawieniach Gemini. Skrypt woła model
 * bezpośrednio (bez HTTP i bez zapisu w Blobie) i pokazuje zużycie tokenów obok
 * odczytanych pól — bo najtańsze ustawienie jest bez wartości, jeśli myli NIP-y
 * albo gubi kwotę.
 *
 * Użycie: npm run ai:cost -- "C:\sciezka\do\faktury.jpg" ["C:\oczekiwane.json"]
 *
 * Plik z oczekiwanymi wartościami to zwykły JSON z polami odczytu
 * (`invoiceNumber`, `issueDate`, `sellerName`, ...). Gdy go podasz, przy każdym
 * wariancie stanie liczba pól odczytanych poprawnie.
 */
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import {
  extractInvoice,
  InvoiceScanError,
  type ExtractedInvoice,
  type ExtractionSettings,
  type ExtractionUsage,
} from "@/lib/ai/extract-invoice";

import { loadLocalEnv } from "./env";

const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Cennik Gemini 3 Flash w dolarach za milion tokenów. Myślenie liczy się jak
 * wyjście, dlatego wyjście jest wielokrotnie droższe od wejścia.
 */
const INPUT_PER_MILLION = 0.5;
const OUTPUT_PER_MILLION = 3;

/**
 * Darmowy plan AI Studio rozlicza tokeny na minutę, a jeden odczyt faktury
 * potrafi zjeść cały ten limit. Stąd długa przerwa między wariantami i jeszcze
 * dłuższa po odbiciu się od limitu.
 */
const PRZERWA_MS = 75_000;
const PRZERWA_PO_LIMICIE_MS = 120_000;

const FLASH = "gemini-3.5-flash";
const FLASH_LITE = "gemini-3.5-flash-lite";

const WARIANTY: ExtractionSettings[] = [
  { model: FLASH, mediaResolution: "MEDIA_RESOLUTION_HIGH", thinkingLevel: "high" },
  { model: FLASH, mediaResolution: "MEDIA_RESOLUTION_HIGH", thinkingLevel: "low" },
  { model: FLASH, mediaResolution: "MEDIA_RESOLUTION_MEDIUM", thinkingLevel: "low" },
  {
    model: FLASH,
    mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
    thinkingLevel: "minimal",
  },
  { model: FLASH, mediaResolution: "MEDIA_RESOLUTION_LOW", thinkingLevel: "minimal" },
  { model: FLASH_LITE, mediaResolution: "MEDIA_RESOLUTION_HIGH", thinkingLevel: "low" },
  {
    model: FLASH_LITE,
    mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
    thinkingLevel: "low",
  },
  {
    model: FLASH_LITE,
    mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
    thinkingLevel: "minimal",
  },
  {
    model: FLASH_LITE,
    mediaResolution: "MEDIA_RESOLUTION_LOW",
    thinkingLevel: "minimal",
  },
];

function nazwa(settings: ExtractionSettings): string {
  const resolution = settings.mediaResolution.replace("MEDIA_RESOLUTION_", "");
  return `${settings.model}, zdjecie ${resolution}, myslenie ${settings.thinkingLevel}`;
}

const POLA = [
  "invoiceNumber",
  "issueDate",
  "sellerName",
  "sellerNip",
  "buyerName",
  "buyerNip",
  "grossAmount",
  "netAmount",
  "vatAmount",
] as const;

function koszt(usage: ExtractionUsage): string {
  const dolary =
    (usage.inputTokens * INPUT_PER_MILLION +
      usage.outputTokens * OUTPUT_PER_MILLION) /
    1_000_000;
  return `${(dolary * 1000).toFixed(2)} centa / 1000 odczytow`;
}

function porownanie(
  data: ExtractedInvoice,
  oczekiwane: Partial<ExtractedInvoice> | null,
): string[] {
  if (oczekiwane === null) {
    return POLA.map((pole) => `${pole}: ${data[pole] ?? "—"}`);
  }

  return POLA.filter((pole) => pole in oczekiwane).map((pole) => {
    const odczyt = data[pole] ?? "—";
    const wzorzec = oczekiwane[pole] ?? "—";
    return odczyt === wzorzec ? `${pole}: ${odczyt}` : `${pole}: ${odczyt} (≠ ${wzorzec})`;
  });
}

function zgodnosc(
  data: ExtractedInvoice,
  oczekiwane: Partial<ExtractedInvoice> | null,
): string {
  if (oczekiwane === null) return "";
  const sprawdzane = POLA.filter((pole) => pole in oczekiwane);
  const trafione = sprawdzane.filter((pole) => (data[pole] ?? "—") === (oczekiwane[pole] ?? "—"));
  return `, poprawnych pol ${trafione.length}/${sprawdzane.length}`;
}

const czekaj = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  loadLocalEnv();

  const argumenty = process.argv.slice(2);
  const wybranyModel = argumenty
    .find((argument) => argument.startsWith("--model="))
    ?.slice("--model=".length);
  const sciezki = argumenty.filter((argument) => !argument.startsWith("--"));

  const imagePath = sciezki[0];
  if (!imagePath) {
    throw new Error('Podaj ścieżkę do zdjęcia: npm run ai:cost -- "C:\\faktura.jpg"');
  }

  const mediaType = MEDIA_TYPES[extname(imagePath).toLowerCase()];
  if (!mediaType) throw new Error(`Nieobsługiwany format: ${extname(imagePath)}`);

  const expectedPath = sciezki[1];
  const oczekiwane: Partial<ExtractedInvoice> | null = expectedPath
    ? JSON.parse(await readFile(expectedPath, "utf8"))
    : null;

  const bytes = new Uint8Array(await readFile(imagePath));
  console.log(`${basename(imagePath)} — ${Math.round(bytes.length / 1024)} KB\n`);

  // Dzienny limit darmowego planu jest liczony osobno dla każdego modelu,
  // więc czasem chcemy zmierzyć tylko ten, którego pula jeszcze została.
  const doZmierzenia = wybranyModel
    ? WARIANTY.filter((wariant) => wariant.model === wybranyModel)
    : WARIANTY;

  for (const [numer, wariant] of doZmierzenia.entries()) {
    if (numer > 0) await czekaj(PRZERWA_MS);

    // Dwa ponowienia: odbicie się od limitu na minutę nie mówi nic o wariancie.
    for (let proba = 1; proba <= 3; proba += 1) {
      const startedAt = Date.now();
      try {
        const { data, usage } = await extractInvoice(bytes, mediaType, wariant);
        const sekundy = ((Date.now() - startedAt) / 1000).toFixed(1);

        console.log(nazwa(wariant));
        console.log(
          `  wejscie ${usage.inputTokens}, wyjscie ${usage.outputTokens} (myslenie ${usage.reasoningTokens}), razem ${usage.totalTokens}`,
        );
        console.log(`  ${koszt(usage)}, ${sekundy} s${zgodnosc(data, oczekiwane)}`);
        for (const linia of porownanie(data, oczekiwane)) console.log(`    ${linia}`);
        console.log("");
        break;
      } catch (error) {
        const limit = error instanceof InvoiceScanError && error.status === 429;
        if (limit && proba < 3) {
          console.log(`${nazwa(wariant)}\n  limit na minutę, czekam...`);
          await czekaj(PRZERWA_PO_LIMICIE_MS);
          continue;
        }

        const powod = error instanceof Error ? error.message : String(error);
        console.log(`${nazwa(wariant)}\n  BŁĄD: ${powod}\n`);
        break;
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
