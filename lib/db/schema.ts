import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Kwoty trzymamy jako `numeric(12,2)`, a Drizzle zwraca je jako stringi.
 * Nigdy nie zamieniamy ich na `number` przy liczeniu, bo liczby
 * zmiennoprzecinkowe gubią grosze na sumach.
 */
const amount = (name: string) => numeric(name, { precision: 12, scale: 2 });

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    invoiceNumber: text("invoice_number").notNull(),
    issueDate: date("issue_date").notNull(),

    sellerName: text("seller_name").notNull(),
    sellerNip: text("seller_nip"),

    buyerName: text("buyer_name").notNull(),
    buyerNip: text("buyer_nip"),

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
    index("invoices_number_seller_idx").on(table.invoiceNumber, table.sellerName),
  ],
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

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type AiUsage = typeof aiUsage.$inferSelect;
