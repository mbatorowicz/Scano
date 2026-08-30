"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isInvoiceBlobPathname } from "@/lib/blob";
import {
  resolveContractor,
  resolveRecipient,
} from "@/lib/contractors/service";
import { formatDate } from "@/lib/dates";
import {
  failedFormState,
  invalidFormState,
  readEntityId,
} from "@/lib/forms/form-state";
import { formatCurrency } from "@/lib/money";
import { hasValidSession } from "@/lib/session";

import {
  DUPLICATE_CONFIRM_FIELD,
  DUPLICATE_CONFIRMED_VALUE,
  IMAGE_PATHNAME_FIELD,
  INVOICE_ID_FIELD,
  type InvoiceFieldName,
  type InvoiceFormState,
} from "./form";
import { findDuplicateInvoice } from "./repository";
import {
  buyerFromParties,
  invoiceFormSchema,
  readInvoiceFormValues,
} from "./schema";
import {
  createInvoice,
  deleteInvoice,
  updateInvoice,
  type InvoiceInput,
} from "./service";

function failure(message: string): InvoiceFormState {
  return { ...failedFormState<InvoiceFieldName>(message), invoiceId: null };
}

/**
 * Ścieżka zdjęcia przychodzi z ukrytego pola, więc traktujemy ją jak dane
 * od użytkownika: przyjmujemy tylko to, co leży w katalogu faktur.
 */
function readImagePathname(formData: FormData): string | null {
  const value = formData.get(IMAGE_PATHNAME_FIELD);
  if (typeof value !== "string" || value.trim() === "") return null;
  return isInvoiceBlobPathname(value) ? value : null;
}

export async function saveInvoice(
  _previous: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  // Akcję da się wywołać zwykłym POST-em, więc sesję sprawdzamy tutaj,
  // niezależnie od tego, że proxy i layout też ją sprawdzają.
  if (!(await hasValidSession())) {
    return failure("Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.");
  }

  const parsed = invoiceFormSchema.safeParse(readInvoiceFormValues(formData));
  if (!parsed.success) {
    return {
      ...invalidFormState<InvoiceFieldName>(parsed.error),
      invoiceId: null,
    };
  }

  const buyerParty = buyerFromParties(parsed.data);
  if (buyerParty === null) {
    return {
      status: "invalid",
      message: "Popraw zaznaczone pola i spróbuj jeszcze raz.",
      fieldErrors: { buyerName: "Podaj nazwę nabywcy." },
      invoiceId: null,
    };
  }

  /** Brak identyfikatora znaczy, że zapisujemy nową fakturę. */
  const id = readEntityId(formData, INVOICE_ID_FIELD);
  const confirmed =
    formData.get(DUPLICATE_CONFIRM_FIELD) === DUPLICATE_CONFIRMED_VALUE;

  const seller = await resolveContractor({
    name: parsed.data.sellerName,
    nip: parsed.data.sellerNip,
  });

  if (!confirmed) {
    const duplicate = await findDuplicateInvoice(
      parsed.data.invoiceNumber,
      seller.id,
      id ?? undefined,
    );
    if (duplicate !== null) {
      return {
        status: "duplicate",
        message: `Faktura ${duplicate.invoiceNumber} od ${duplicate.sellerName} jest już zapisana — ${formatDate(duplicate.issueDate)}, ${formatCurrency(duplicate.grossAmount)}.`,
        fieldErrors: {},
        invoiceId: duplicate.id,
      };
    }
  }

  const buyer = await resolveContractor(buyerParty);

  const recipient = await resolveRecipient({
    name: parsed.data.recipientName,
    nip: parsed.data.recipientNip,
  });

  const input: InvoiceInput = {
    invoiceNumber: parsed.data.invoiceNumber,
    issueDate: parsed.data.issueDate,
    sellerId: seller.id,
    buyerId: buyer.id,
    recipientId: recipient?.id ?? null,
    grossAmount: parsed.data.grossAmount,
    netAmount: parsed.data.netAmount,
    vatAmount: parsed.data.vatAmount,
    costAmount: parsed.data.costAmount,
    imagePathname: readImagePathname(formData),
  };

  try {
    const saved =
      id === null ? await createInvoice(input) : await updateInvoice(id, input);

    if (saved === null) {
      return failure("Nie znaleziono faktury do zapisania. Odśwież stronę.");
    }

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${saved.id}`);
    revalidatePath("/contractors");

    return {
      status: "saved",
      message: id === null ? "Faktura zapisana." : "Zmiany zapisane.",
      fieldErrors: {},
      invoiceId: saved.id,
    };
  } catch (cause) {
    console.error("Zapis faktury nie udał się", cause);
    return failure("Zapis się nie udał. Spróbuj jeszcze raz.");
  }
}

/**
 * Usuwa fakturę razem ze zdjęciem. Formularz usuwania nie ma gdzie pokazać
 * błędu — po udanym usunięciu strona faktury przestaje istnieć — więc awarie
 * lecą do granicy błędu segmentu zamiast kończyć się cichym powrotem.
 */
export async function removeInvoice(formData: FormData): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");

  const id = readEntityId(formData, INVOICE_ID_FIELD);
  if (id === null) {
    throw new Error("Formularz usuwania przyszedł bez numeru faktury.");
  }

  // Wiersza może już nie być, gdy tę samą fakturę usunięto w drugiej karcie.
  // Skutek jest ten sam, o który prosił użytkownik, więc to nie jest błąd.
  await deleteInvoice(id);

  revalidatePath("/invoices");
  revalidatePath("/contractors");
  redirect("/invoices");
}
