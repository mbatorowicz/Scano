/**
 * Reguły faktury: co znaczy pusta kwota, jak zapisujemy NIP i skąd bierze się
 * należność. Warstwa nie zna `FormData` ani adresów — przyjmuje gotowe wartości
 * i oddaje zapisany wiersz.
 */
import { del } from "@vercel/blob";

import type { Invoice } from "@/lib/db/schema";
import {
  InvalidAmountError,
  optionalAmount,
  requireAmount,
} from "@/lib/money";
import { nipDigits } from "@/lib/nip";
import { calculatePayout, normalizeCostAmount } from "@/lib/payout";

import {
  deleteInvoiceRow,
  getInvoice,
  insertInvoice,
  updateInvoiceRow,
  type InvoiceRow,
} from "./repository";

export type InvoiceInput = {
  invoiceNumber: string;
  /** Data w formacie ISO (`2026-08-12`), tak jak trzyma ją kolumna `date`. */
  issueDate: string;
  sellerName: string;
  sellerNip?: string | null;
  buyerName: string;
  buyerNip?: string | null;
  grossAmount: string;
  netAmount?: string | null;
  vatAmount?: string | null;
  imagePathname?: string | null;
  /** Cena, jaką sam zapłaciłem; pusta znaczy zero. */
  costAmount?: string | null;
};

/**
 * Należność liczymy przy każdym zapisie od nowa — inaczej po poprawieniu kwoty
 * brutto albo ceny dla mnie w kolumnie zostałaby stara wartość.
 */
function toRow(input: InvoiceInput, imagePathname: string | null): InvoiceRow {
  const grossAmount = requireAmount(input.grossAmount, "wartość brutto");

  const costAmount = normalizeCostAmount(input.costAmount);
  if (costAmount === null) throw new InvalidAmountError("cena dla mnie");

  const payoutAmount = calculatePayout(grossAmount, costAmount);
  if (payoutAmount === null) throw new InvalidAmountError("należność dla mnie");

  return {
    invoiceNumber: input.invoiceNumber.trim(),
    issueDate: input.issueDate,
    sellerName: input.sellerName.trim(),
    sellerNip: nipDigits(input.sellerNip),
    buyerName: input.buyerName.trim(),
    buyerNip: nipDigits(input.buyerNip),
    grossAmount,
    netAmount: optionalAmount(input.netAmount),
    vatAmount: optionalAmount(input.vatAmount),
    costAmount,
    payoutAmount,
    imagePathname,
  };
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  return insertInvoice(toRow(input, input.imagePathname ?? null));
}

export async function updateInvoice(
  id: number,
  input: InvoiceInput,
): Promise<Invoice | null> {
  const current = await getInvoice(id);
  if (current === null) return null;

  // Edycja bez nowego zdjęcia nie może skasować tego, które już jest.
  const imagePathname = input.imagePathname ?? current.imagePathname;

  return updateInvoiceRow(id, toRow(input, imagePathname));
}

/**
 * Usunięcie faktury razem ze zdjęciem — trzymanie go bez wiersza nie ma sensu.
 * Nieudane usunięcie pliku nie przewraca operacji: wiersza już nie ma, więc
 * osierocone zdjęcie to najwyżej zajęte miejsce, które sprząta `blob:clean`.
 */
export async function deleteInvoice(id: number): Promise<Invoice | null> {
  const removed = await deleteInvoiceRow(id);

  if (removed?.imagePathname) {
    await del(removed.imagePathname).catch((cause) => {
      console.error("Nie udało się usunąć zdjęcia faktury", cause);
    });
  }

  return removed;
}
