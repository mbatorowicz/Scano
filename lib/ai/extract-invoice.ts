import { google } from "@ai-sdk/google";
import {
  APICallError,
  generateText,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  RetryError,
} from "ai";
import { z } from "zod";

import { isIsoDate } from "@/lib/dates";
import { parseAmount, sumAmounts, toMinorUnits } from "@/lib/money";

/** Flash wystarcza do odczytu faktury i mieści się w darmowym limicie AI Studio. */
export const EXTRACTION_MODEL = "gemini-3.5-flash";

/**
 * Zapas na wyczerpany limit dobowy. Darmowy plan daje 20 odczytów na dobę
 * liczonych osobno dla każdego modelu, więc gdy Flash powie „dość", Flash Lite
 * ma jeszcze własną pulę. Czyta drobny druk gorzej, ale to i tak lepsze niż
 * „wróć jutro" — dane i tak przechodzą przez formularz korekty.
 */
export const FALLBACK_MODEL = "gemini-3.5-flash-lite";

/** Ile odczytów na dobę daje darmowy plan AI Studio dla jednego modelu. */
export const FREE_TIER_DAILY_LIMIT = 20;

/**
 * Rachunek za jeden odczyt to prawie wyłącznie zdjęcie i „myślenie" modelu.
 *
 * Zdjęcie kosztuje tyle, na ile pozwoli `mediaResolution`, niezależnie od tego,
 * ile ma pikseli: 280 tokenów przy `LOW`, 560 przy `MEDIUM`, 1120 przy `HIGH`
 * (tyle bierze też domyślne ustawienie). Myślenie liczy się jak tokeny wyjścia,
 * czyli kilka razy drożej od wejścia, a Flash bez wskazania poziomu myśli na
 * `high`. Odczyt faktury to przepisywanie tego, co widać, a nie rozumowanie,
 * więc oba pokrętła skręcamy w dół — dobrane pomiarem w `npm run ai:cost`.
 */
export type ExtractionSettings = {
  model: string;
  mediaResolution:
    | "MEDIA_RESOLUTION_LOW"
    | "MEDIA_RESOLUTION_MEDIUM"
    | "MEDIA_RESOLUTION_HIGH";
  thinkingLevel: "minimal" | "low" | "medium" | "high";
};

export const DEFAULT_EXTRACTION_SETTINGS: ExtractionSettings = {
  model: EXTRACTION_MODEL,
  mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
  thinkingLevel: "low",
};

/** Zużycie jednego odczytu. Myślenie siedzi już w `outputTokens`. */
export type ExtractionUsage = {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

export type ExtractionResult = {
  data: ExtractedInvoice;
  usage: ExtractionUsage;
  /** Model, który faktycznie odczytał zdjęcie — przy zapasowym bywa inny niż domyślny. */
  model: string;
};

/**
 * Zero ponowień. Limit dobowy liczy zapytania, więc cicha powtórka zabiera
 * odczyt, którego użytkownik nawet nie zobaczył — a robi to akurat wtedy, gdy
 * model odpowiada wolno albo się dławi. Powtórka zostaje decyzją użytkownika:
 * widzi błąd i sam wybiera, czy poświęcić na to kolejną próbę.
 */
const MAX_RETRIES = 0;

const TIMEOUT_MS = 45_000;

/**
 * Każde pole może być `null`. Gdy Gemini czegoś nie odczyta, zostawiamy puste
 * do ręcznego uzupełnienia — zmyślony numer albo kwota są groźniejsze niż luka,
 * bo nikt ich nie zauważy przy zatwierdzaniu.
 */
const extractionSchema = z.object({
  invoiceNumber: z
    .string()
    .nullable()
    .describe('Numer faktury dokładnie tak, jak na dokumencie, np. "0350/2026".'),
  issueDate: z
    .string()
    .nullable()
    .describe('Data wystawienia w formacie ISO "RRRR-MM-DD".'),
  sellerName: z
    .string()
    .nullable()
    .describe(
      'Sama nazwa sprzedawcy, bez adresu i NIP-u, np. \'F.H.U. "Pecet" Mariusz Szczęsny\'.',
    ),
  sellerNip: z.string().nullable().describe("NIP sprzedawcy, same cyfry."),
  buyerName: z
    .string()
    .nullable()
    .describe(
      'Sama nazwa nabywcy z bloku NABYWCA, bez adresu i NIP-u, np. "Gmina Miedzna". Nie nazwa z bloku ODBIORCA.',
    ),
  buyerNip: z
    .string()
    .nullable()
    .describe("NIP nabywcy z bloku NABYWCA, same cyfry. Nie NIP odbiorcy."),
  /**
   * Odbiorcy nie zapisujemy, ale musi mieć w odpowiedzi własne miejsce.
   * Bez tych dwóch pól model wpisywał NIP odbiorcy do `buyerNip` — dane, które
   * widzi na fakturze, muszą gdzieś trafić, więc lądowały w najbliższym
   * pasującym polu.
   */
  recipientName: z
    .string()
    .nullable()
    .describe("Nazwa z bloku ODBIORCA, jeśli faktura go wymienia."),
  recipientNip: z
    .string()
    .nullable()
    .describe("NIP z bloku ODBIORCA, same cyfry, jeśli faktura go wymienia."),
  grossAmount: z
    .string()
    .nullable()
    .describe('Wartość brutto, czyli "razem do zapłaty". Bez symbolu waluty.'),
  netAmount: z.string().nullable().describe("Wartość netto. Bez symbolu waluty."),
  vatAmount: z.string().nullable().describe("Kwota VAT. Bez symbolu waluty."),
});

const INSTRUCTIONS = `Odczytujesz dane z polskiej faktury ze zdjęcia. Zwracasz tylko to, co widzisz.

Zasady:
- Przecinek jest separatorem dziesiętnym. "750,00" to siedemset pięćdziesiąt złotych, a nie siedemdziesiąt pięć tysięcy. Kropka albo spacja rozdzielają tysiące: "1.234,56" i "1 234,56" to tysiąc dwieście trzydzieści cztery złote i pięćdziesiąt sześć groszy.
- Kwoty przepisujesz bez symbolu waluty, bez "zł" i bez "PLN".
- Sprzedawca to strona, która wystawiła fakturę. Nabywca to strona, która za nią płaci. Nie zamieniaj ich miejscami, nawet gdy nabywca jest wydrukowany wyżej.
- Faktura może wymieniać trzy strony: SPRZEDAWCA, NABYWCA i ODBIORCA. Każda ma w odpowiedzi własne pola. Danych odbiorcy nie wpisujesz do pól nabywcy, nawet gdy odbiorca ma osobną nazwę i własny NIP.
- NIP bierzesz z tego samego bloku, z którego wziąłeś nazwę. Gdy w bloku nabywcy jest "NIP/PESEL", to właśnie jest NIP nabywcy, a "NIP" pod nazwą odbiorcy należy do odbiorcy.
- W nazwie sprzedawcy i nabywcy podajesz wyłącznie nazwę firmy albo instytucji. Ulicę, kod pocztowy, miasto i NIP pomijasz.
- Wartość brutto to kwota "razem do zapłaty" albo "brutto" — nie suma pozycji przed rabatem.
- Datę wystawienia zwracasz w formacie RRRR-MM-DD. Gdy na fakturze są dwie daty (wystawienia i sprzedaży), bierzesz datę wystawienia.
- NIP przepisujesz jako same cyfry, bez kresek i prefiksu "PL".
- Czego nie widzisz albo nie potrafisz odczytać, zwracasz jako null. Nie zgadujesz i nie wyliczasz brakujących wartości.`;

export type ExtractedInvoice = {
  invoiceNumber: string | null;
  issueDate: string | null;
  sellerName: string | null;
  sellerNip: string | null;
  buyerName: string | null;
  buyerNip: string | null;
  grossAmount: string | null;
  netAmount: string | null;
  vatAmount: string | null;
};

/** Błąd z komunikatem gotowym do pokazania użytkownikowi. */
export class InvoiceScanError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InvoiceScanError";
    this.status = status;
  }
}

export function isExtractionConfigured(): boolean {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return typeof key === "string" && key.length > 0;
}

export async function extractInvoice(
  image: Uint8Array,
  mediaType: string,
  settings: ExtractionSettings = DEFAULT_EXTRACTION_SETTINGS,
): Promise<ExtractionResult> {
  if (!isExtractionConfigured()) {
    throw new InvoiceScanError(
      "Brak klucza do Gemini. Uzupełnij GOOGLE_GENERATIVE_AI_API_KEY i zrestartuj aplikację.",
      503,
    );
  }

  try {
    const { output, usage } = await generateText({
      model: google(settings.model),
      instructions: INSTRUCTIONS,
      maxRetries: MAX_RETRIES,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      providerOptions: {
        google: {
          mediaResolution: settings.mediaResolution,
          thinkingConfig: { thinkingLevel: settings.thinkingLevel },
        },
      },
      output: Output.object({
        name: "Faktura",
        description: "Dane odczytane z polskiej faktury.",
        schema: extractionSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Odczytaj dane z tej faktury. Zdjęcie może być krzywe albo pogniecione.",
            },
            { type: "file", mediaType, data: image },
          ],
        },
      ],
    });

    return {
      data: normalize(output),
      usage: {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
      },
      model: settings.model,
    };
  } catch (error) {
    throw asScanError(error);
  }
}

/**
 * Odczyt z sięgnięciem po zapasowy model, gdy pierwszy odmawia z powodu limitu.
 * To jedyne miejsce, w którym aplikacja wysyła zdjęcie do modelu dwa razy —
 * i robi to tylko wtedy, gdy pierwsze wysłanie nic nie kosztowało, bo zostało
 * odrzucone przed odczytem.
 */
export async function extractInvoiceWithFallback(
  image: Uint8Array,
  mediaType: string,
): Promise<ExtractionResult> {
  try {
    return await extractInvoice(image, mediaType);
  } catch (error) {
    if (!(error instanceof InvoiceScanError) || error.status !== 429) throw error;

    console.warn(
      `Limit modelu ${DEFAULT_EXTRACTION_SETTINGS.model} wyczerpany, próbuję ${FALLBACK_MODEL}`,
    );

    return extractInvoice(image, mediaType, {
      ...DEFAULT_EXTRACTION_SETTINGS,
      model: FALLBACK_MODEL,
    });
  }
}

function asScanError(error: unknown): InvoiceScanError {
  if (error instanceof InvoiceScanError) return error;

  // Po wyczerpaniu ponowień prawdziwa przyczyna siedzi w środku RetryError.
  if (RetryError.isInstance(error)) {
    return asScanError(error.lastError ?? error.errors.at(-1));
  }

  if (isTimeout(error)) {
    return new InvoiceScanError(
      "Odczyt trwał zbyt długo i został przerwany. Spróbuj ponownie.",
      504,
      { cause: error },
    );
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return new InvoiceScanError(
      "Klucz do Gemini jest nieprawidłowy albo go brakuje.",
      503,
      { cause: error },
    );
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return new InvoiceScanError(
        "Wyczerpał się dzienny limit darmowych odczytów AI. Wpisz dane z faktury ręcznie — jutro limit wraca.",
        429,
        { cause: error },
      );
    }
    if (error.statusCode === 401 || error.statusCode === 403) {
      return new InvoiceScanError(
        "Gemini odrzucił klucz API. Sprawdź GOOGLE_GENERATIVE_AI_API_KEY.",
        503,
        { cause: error },
      );
    }
    if (error.statusCode === 503) {
      return new InvoiceScanError(
        "Model odczytu jest w tej chwili przeciążony. Spróbuj ponownie za minutę.",
        503,
        { cause: error },
      );
    }
    return new InvoiceScanError(
      "Usługa odczytu chwilowo nie odpowiada. Spróbuj jeszcze raz.",
      502,
      { cause: error },
    );
  }

  // Model odpowiedział, ale nie dało się z tego zrobić danych faktury —
  // najczęściej zdjęcie jest zbyt nieczytelne.
  if (
    NoObjectGeneratedError.isInstance(error) ||
    NoOutputGeneratedError.isInstance(error)
  ) {
    return new InvoiceScanError(
      "Nie udało się odczytać faktury z tego zdjęcia. Zrób je ponownie w lepszym świetle, tak żeby cała faktura była w kadrze.",
      422,
      { cause: error },
    );
  }

  return new InvoiceScanError("Odczyt faktury się nie udał.", 500, {
    cause: error,
  });
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

/** Dane od modelu w postaci, jakiej oczekuje formularz i baza. */
function normalize(raw: z.infer<typeof extractionSchema>): ExtractedInvoice {
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
    sellerNip: nip(raw.sellerNip),
    buyerName: text(raw.buyerName),
    buyerNip: nip(raw.buyerNip),
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

function nip(value: string | null): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  // Polski NIP ma 10 cyfr; cokolwiek innego to pomyłka w odczycie.
  return digits.length === 10 ? digits : null;
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
