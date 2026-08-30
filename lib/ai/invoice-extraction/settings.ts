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

/** Flash wystarcza do odczytu faktury i mieści się w darmowym limicie AI Studio. */
export const EXTRACTION_MODEL = "gemini-3.5-flash";

/**
 * Zapas na wyczerpany limit dobowy. Darmowy plan daje odczyty liczone osobno
 * dla każdego modelu, więc gdy Flash powie „dość", Flash Lite ma jeszcze własną
 * pulę. Czyta drobny druk gorzej, ale to i tak lepsze niż „wróć jutro" — dane
 * i tak przechodzą przez formularz korekty.
 */
export const FALLBACK_MODEL = "gemini-3.5-flash-lite";

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

export function isExtractionConfigured(): boolean {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return typeof key === "string" && key.length > 0;
}
