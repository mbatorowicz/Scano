/**
 * Tłumaczenie awarii SDK na komunikat, który da się pokazać użytkownikowi,
 * i na kod HTTP, który trasa `/api/scan` odeśle bez dalszego zgadywania.
 */
import {
  APICallError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  RetryError,
} from "ai";

/** Błąd z komunikatem gotowym do pokazania użytkownikowi. */
export class InvoiceScanError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InvoiceScanError";
    this.status = status;
  }
}

export function asScanError(error: unknown): InvoiceScanError {
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
        "Wyczerpał się dzienny limit darmowych odczytów AI. Wpisz dane z faktury ręcznie — jutro limit wraca.",
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
