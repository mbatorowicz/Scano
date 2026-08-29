import { createHash } from "node:crypto";

import type { ExtractionResult } from "./extract-invoice";

/**
 * Pamięć ostatnio odczytanych zdjęć. Darmowy plan rozlicza odczyty sztukami, a
 * to samo zdjęcie potrafi trafić na serwer dwa razy: po odświeżeniu strony,
 * po dwukrotnym dotknięciu przycisku albo gdy ktoś wybierze z galerii plik,
 * który już skanował. Drugi raz oddajemy poprzedni odczyt zamiast pytać model.
 *
 * Trzymamy to w pamięci procesu, więc po jego wygaszeniu pamięć znika — to
 * tylko oszczędność, nie źródło prawdy.
 */
const TTL_MS = 15 * 60_000;
const MAX_ENTRIES = 8;

type Entry = { result: ExtractionResult; at: number };

const entries = new Map<string, Entry>();

export function scanFingerprint(image: Uint8Array): string {
  return createHash("sha256").update(image).digest("hex");
}

export function recallScan(fingerprint: string): ExtractionResult | null {
  const entry = entries.get(fingerprint);
  if (entry === undefined) return null;

  if (Date.now() - entry.at > TTL_MS) {
    entries.delete(fingerprint);
    return null;
  }

  return entry.result;
}

export function rememberScan(fingerprint: string, result: ExtractionResult): void {
  // Mapa trzyma kolejność wstawiania, więc najstarszy wpis jest pierwszy.
  if (entries.size >= MAX_ENTRIES) {
    const oldest = entries.keys().next();
    if (!oldest.done) entries.delete(oldest.value);
  }

  entries.set(fingerprint, { result, at: Date.now() });
}
