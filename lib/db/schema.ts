import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Kwoty trzymamy jako `numeric(12,2)`, a Drizzle zwraca je jako stringi.
 * Nigdy nie zamieniamy ich na `number` przy liczeniu, bo liczby
 * zmiennoprzecinkowe gubią grosze na sumach.
 */
const amount = (name: string) => numeric(name, { precision: 12, scale: 2 });

/**
 * Sprzedawcy i nabywcy w jednej tabeli, bo to ta sama rzecz — firma. Ta sama
 * firma raz sprzedaje, raz kupuje, a dwie osobne tabele znaczyłyby dwa wpisy
 * tej samej nazwy i dwa miejsca do poprawiania literówki po odczycie AI.
 */
export const contractors = pgTable(
  "contractors",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Same cyfry albo nic; NIP należy do firmy, nie do pojedynczej faktury. */
    nip: text("nip"),
    /**
     * Tożsamość firmy: `nip:<cyfry>`, a bez NIP-u `name:<nazwa bez ozdób>`.
     * Klucz liczy `lib/contractors/match-key.ts` — baza pilnuje tylko, żeby
     * dwie firmy nie stanęły pod tym samym.
     */
    matchKey: text("match_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("contractors_match_key_idx").on(table.matchKey),
    index("contractors_name_idx").on(table.name),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    invoiceNumber: text("invoice_number").notNull(),
    issueDate: date("issue_date").notNull(),

    /**
     * Strony faktury trzymamy wskazaniem, a nie nazwą, żeby poprawka nazwy
     * kontrahenta była widoczna od razu na wszystkich jego fakturach.
     */
    sellerId: integer("seller_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "restrict" }),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "restrict" }),

    grossAmount: amount("gross_amount").notNull(),
    netAmount: amount("net_amount"),
    vatAmount: amount("vat_amount"),

    /** Cena, jaką sam zapłaciłem za towar — wpisywana ręcznie, nie ma jej na fakturze. */
    costAmount: amount("cost_amount").notNull().default("0.00"),

    /**
     * Marża po VAT i podatku dochodowym, wyliczona przy zapisie. Trzymamy ją
     * w kolumnie, żeby sumy na liście i w eksporcie liczyła baza, a nie każdy
     * ekran po swojemu.
     */
    payoutAmount: amount("payout_amount").notNull(),

    /** Ścieżka pliku w Vercel Blob, nie publiczny adres — zdjęcia serwuje `/api/image`. */
    imagePathname: text("image_pathname"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoices_issue_date_idx").on(table.issueDate),
    // Wyszukiwanie duplikatu przy zapisie nowego skanu.
    index("invoices_number_seller_idx").on(table.invoiceNumber, table.sellerId),
  ],
);

/**
 * Wypłaty należności. Rozliczenie to okrągła kwota wypłacona co kilka tygodni,
 * a nie zapłata za konkretne faktury, więc wiersz nie wskazuje żadnej z nich —
 * liczy się tylko saldo: suma należności minus suma wypłat.
 */
export const settlements = pgTable(
  "settlements",
  {
    id: serial("id").primaryKey(),
    /** Dzień, w którym pieniądze faktycznie do mnie trafiły. */
    settledOn: date("settled_on").notNull(),
    amount: amount("amount").notNull(),
    /** Krótka notatka, np. „gotówka" albo „przelew za lipiec". */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("settlements_settled_on_idx").on(table.settledOn)],
);

/**
 * Zużycie modelu przy odczycie faktury. Bez tego licznika nie da się
 * powiedzieć, czy zmiana ustawień Gemini rzeczywiście coś oszczędziła — a przy
 * darmowym limicie z AI Studio to różnica między „działa" a „wróć za minutę".
 * Wiersz zapisujemy też dla nieudanego odczytu, bo tokeny za niego i tak lecą.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: serial("id").primaryKey(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    /** Razem z „myśleniem" modelu — Gemini liczy je jak tokeny wyjścia. */
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("ai_usage_created_at_idx").on(table.createdAt)],
);

export type Contractor = typeof contractors.$inferSelect;
export type NewContractor = typeof contractors.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
export type AiUsage = typeof aiUsage.$inferSelect;
export type NewAiUsage = typeof aiUsage.$inferInsert;
