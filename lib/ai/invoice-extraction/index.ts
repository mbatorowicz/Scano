/**
 * Odczyt faktury ze zdjęcia przez Gemini. Ten plik odpowiada tylko za samo
 * wywołanie modelu — instrukcje, schemat odpowiedzi, normalizacja i tłumaczenie
 * błędów siedzą w plikach obok.
 */
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import { EXTRACTION_MAX_RETRIES, EXTRACTION_TIMEOUT_MS } from "@/lib/config";

import { asScanError, InvoiceScanError } from "./errors";
import { normalize, type ExtractedInvoice } from "./normalize";
import { extractionSchema } from "./output-schema";
import { INSTRUCTIONS, USER_MESSAGE } from "./prompt";
import {
  DEFAULT_EXTRACTION_SETTINGS,
  FALLBACK_MODEL,
  isExtractionConfigured,
  type ExtractionSettings,
} from "./settings";

export { InvoiceScanError } from "./errors";
export type { ExtractedInvoice } from "./normalize";
export {
  EXTRACTION_MODEL,
  FALLBACK_MODEL,
  isExtractionConfigured,
  type ExtractionSettings,
} from "./settings";

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
      maxRetries: EXTRACTION_MAX_RETRIES,
      abortSignal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
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
            { type: "text", text: USER_MESSAGE },
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
