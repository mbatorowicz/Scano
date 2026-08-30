import { z } from "zod";

/**
 * Każde pole może być `null`. Gdy Gemini czegoś nie odczyta, zostawiamy puste
 * do ręcznego uzupełnienia — zmyślony numer albo kwota są groźniejsze niż luka,
 * bo nikt ich nie zauważy przy zatwierdzaniu.
 */
export const extractionSchema = z.object({
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

/** Odpowiedź modelu przed normalizacją — tak, jak ją opisuje schemat. */
export type RawExtraction = z.infer<typeof extractionSchema>;
