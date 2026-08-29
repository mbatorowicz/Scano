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
const MODEL = "gemini-3.5-flash";

/**
 * Jedno ponowienie, nie trzy: gdy model jest przeciążony, kolejne próby z
 * narastającą przerwą trzymają użytkownika przed pustym ekranem prawie dwie
 * minuty. Lepiej szybko powiedzieć „spróbuj jeszcze raz".
 */
const MAX_RETRIES = 1;

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
): Promise<ExtractedInvoice> {
  if (!isExtractionConfigured()) {
    throw new InvoiceScanError(
      "Brak klucza do Gemini. Uzupełnij GOOGLE_GENERATIVE_AI_API_KEY i zrestartuj aplikację.",
      503,
    );
  }

  try {
    const { output } = await generateText({
      model: google(MODEL),
      instructions: INSTRUCTIONS,
      maxRetries: MAX_RETRIES,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
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

    return normalize(output);
  } catch (error) {
    throw asScanError(error);
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
        "Wyczerpany limit odczytów Gemini. Poczekaj kilka minut i spróbuj ponownie.",
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

  // Bez kwoty brutto nie ma z czego policzyć prowizji, a suma netto i VAT jest
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
