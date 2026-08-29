"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isInvoiceBlobPathname } from "@/lib/blob";
import { formatDate } from "@/lib/dates";
import {
  createInvoice,
  deleteInvoice,
  findDuplicateInvoice,
  updateInvoice,
  type InvoiceInput,
} from "@/lib/db/queries";
import {
  DUPLICATE_CONFIRM_FIELD,
  DUPLICATE_CONFIRMED_VALUE,
  IMAGE_PATHNAME_FIELD,
  INVOICE_ID_FIELD,
  type InvoiceFormState,
} from "@/lib/invoice-form";
import {
  invoiceFieldErrors,
  invoiceFormSchema,
  readInvoiceFormValues,
} from "@/lib/invoice-schema";
import { formatCurrency } from "@/lib/money";
import { hasValidSession } from "@/lib/session";

function failure(message: string): InvoiceFormState {
  return { status: "error", message, fieldErrors: {}, invoiceId: null };
}

/** Id edytowanej faktury; jego brak znaczy, że zapisujemy nową. */
function readId(formData: FormData): number | null {
  const value = formData.get(INVOICE_ID_FIELD);
  if (typeof value !== "string" || value.trim() === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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
      status: "invalid",
      message: "Popraw zaznaczone pola i spróbuj jeszcze raz.",
      fieldErrors: invoiceFieldErrors(parsed.error),
      invoiceId: null,
    };
  }

  const id = readId(formData);
  const confirmed =
    formData.get(DUPLICATE_CONFIRM_FIELD) === DUPLICATE_CONFIRMED_VALUE;

  if (!confirmed) {
    const duplicate = await findDuplicateInvoice(
      parsed.data.invoiceNumber,
      parsed.data.sellerName,
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

  const input: InvoiceInput = {
    ...parsed.data,
    imagePathname: readImagePathname(formData),
  };

  try {
    const saved = id === null ? await createInvoice(input) : await updateInvoice(id, input);

    if (saved === null) {
      return failure("Nie znaleziono faktury do zapisania. Odśwież stronę.");
    }

    revalidatePath("/");
    revalidatePath(`/invoice/${saved.id}`);

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

/** Usunięcie faktury razem ze zdjęciem — trzymanie go bez wiersza nie ma sensu. */
export async function removeInvoice(formData: FormData): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");

  const id = readId(formData);
  if (id === null) return;

  const removed = await deleteInvoice(id);

  if (removed?.imagePathname) {
    await del(removed.imagePathname).catch((cause) => {
      // Wiersza już nie ma, więc osierocone zdjęcie to najwyżej zajęte miejsce.
      console.error("Nie udało się usunąć zdjęcia faktury", cause);
    });
  }

  revalidatePath("/");
  redirect("/");
}
