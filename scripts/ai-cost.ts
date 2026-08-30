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
  EXTRACTION_MODEL,
  FALLBACK_MODEL,
  InvoiceScanError,
  type ExtractedInvoice,
  type ExtractionSettings,
  type ExtractionUsage,
} from "@/lib/ai/invoice-extraction";
import { imageTypeForExtension } from "@/lib/blob";

import { loadLocalEnv } from "./env";

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
const PAUSE_MS = 75_000;
const PAUSE_AFTER_LIMIT_MS = 120_000;

const FLASH = EXTRACTION_MODEL;
const FLASH_LITE = FALLBACK_MODEL;

const VARIANTS: ExtractionSettings[] = [
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

function variantLabel(settings: ExtractionSettings): string {
  const resolution = settings.mediaResolution.replace("MEDIA_RESOLUTION_", "");
  return `${settings.model}, zdjecie ${resolution}, myslenie ${settings.thinkingLevel}`;
}

const FIELDS = [
  "invoiceNumber",
  "issueDate",
  "sellerName",
  "sellerNip",
  "buyerName",
  "buyerNip",
  "recipientName",
  "recipientNip",
  "grossAmount",
  "netAmount",
  "vatAmount",
] as const;

function cost(usage: ExtractionUsage): string {
  const dollars =
    (usage.inputTokens * INPUT_PER_MILLION +
      usage.outputTokens * OUTPUT_PER_MILLION) /
    1_000_000;
  return `${(dollars * 1000).toFixed(2)} centa / 1000 odczytow`;
}

function comparison(
  data: ExtractedInvoice,
  expected: Partial<ExtractedInvoice> | null,
): string[] {
  if (expected === null) {
    return FIELDS.map((field) => `${field}: ${data[field] ?? "—"}`);
  }

  return FIELDS.filter((field) => field in expected).map((field) => {
    const actual = data[field] ?? "—";
    const wanted = expected[field] ?? "—";
    return actual === wanted ? `${field}: ${actual}` : `${field}: ${actual} (≠ ${wanted})`;
  });
}

function accuracy(
  data: ExtractedInvoice,
  expected: Partial<ExtractedInvoice> | null,
): string {
  if (expected === null) return "";
  const checked = FIELDS.filter((field) => field in expected);
  const matched = checked.filter(
    (field) => (data[field] ?? "—") === (expected[field] ?? "—"),
  );
  return `, poprawnych pol ${matched.length}/${checked.length}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  loadLocalEnv();

  const args = process.argv.slice(2);
  const chosenModel = args
    .find((argument) => argument.startsWith("--model="))
    ?.slice("--model=".length);
  const paths = args.filter((argument) => !argument.startsWith("--"));

  const imagePath = paths[0];
  if (!imagePath) {
    throw new Error('Podaj ścieżkę do zdjęcia: npm run ai:cost -- "C:\\faktura.jpg"');
  }

  const mediaType = imageTypeForExtension(extname(imagePath));
  if (mediaType === null) {
    throw new Error(`Nieobsługiwany format: ${extname(imagePath)}`);
  }

  const expectedPath = paths[1];
  const expected: Partial<ExtractedInvoice> | null = expectedPath
    ? JSON.parse(await readFile(expectedPath, "utf8"))
    : null;

  const bytes = new Uint8Array(await readFile(imagePath));
  console.log(`${basename(imagePath)} — ${Math.round(bytes.length / 1024)} KB\n`);

  // Dzienny limit darmowego planu jest liczony osobno dla każdego modelu,
  // więc czasem chcemy zmierzyć tylko ten, którego pula jeszcze została.
  const toMeasure = chosenModel
    ? VARIANTS.filter((variant) => variant.model === chosenModel)
    : VARIANTS;

  for (const [index, variant] of toMeasure.entries()) {
    if (index > 0) await wait(PAUSE_MS);

    // Dwa ponowienia: odbicie się od limitu na minutę nie mówi nic o wariancie.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const startedAt = Date.now();
      try {
        const { data, usage } = await extractInvoice(bytes, mediaType, variant);
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

        console.log(variantLabel(variant));
        console.log(
          `  wejscie ${usage.inputTokens}, wyjscie ${usage.outputTokens} (myslenie ${usage.reasoningTokens}), razem ${usage.totalTokens}`,
        );
        console.log(`  ${cost(usage)}, ${seconds} s${accuracy(data, expected)}`);
        for (const line of comparison(data, expected)) console.log(`    ${line}`);
        console.log("");
        break;
      } catch (error) {
        const rateLimited = error instanceof InvoiceScanError && error.status === 429;
        if (rateLimited && attempt < 3) {
          console.log(`${variantLabel(variant)}\n  limit na minutę, czekam...`);
          await wait(PAUSE_AFTER_LIMIT_MS);
          continue;
        }

        const reason = error instanceof Error ? error.message : String(error);
        console.log(`${variantLabel(variant)}\n  BŁĄD: ${reason}\n`);
        break;
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
