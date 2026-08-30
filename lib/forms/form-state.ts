/**
 * Wspólny kontrakt między formularzem w przeglądarce a akcją na serwerze.
 * Każdy formularz w aplikacji odsyła ten sam kształt stanu i czyta `FormData`
 * tak samo, więc obsługa błędów i pól stoi tutaj raz, a nie w każdej akcji.
 *
 * Plik celowo nie ma dyrektywy `use server` — typy i stan początkowy muszą dać
 * się zaimportować po stronie klienta.
 */

export type FormStatus =
  | "idle"
  /** Walidacja nie przeszła — szczegóły w `fieldErrors`. */
  | "invalid"
  | "error"
  | "saved";

/**
 * `TStatus` dokłada stany, których potrzebuje pojedynczy formularz — faktury
 * mają dodatkowo `duplicate`, czekający na potwierdzenie zapisu.
 */
export type FormState<TField extends string, TStatus extends string = never> = {
  status: FormStatus | TStatus;
  message: string | null;
  fieldErrors: Partial<Record<TField, string>>;
};

export const IDLE_FORM_STATE = {
  status: "idle",
  message: null,
  fieldErrors: {},
} as const satisfies FormState<never>;

/** Zapis się nie udał z przyczyny, na którą użytkownik nie ma wpływu. */
export function failedFormState<TField extends string>(
  message: string,
): FormState<TField> {
  return { status: "error", message, fieldErrors: {} };
}

/** Walidacja odrzuciła dane — komunikat ogólny, szczegóły przy polach. */
export function invalidFormState<TField extends string>(
  error: ValidationError,
): FormState<TField> {
  return {
    status: "invalid",
    message: "Popraw zaznaczone pola i spróbuj jeszcze raz.",
    fieldErrors: fieldErrors<TField>(error),
  };
}

/**
 * Kształt błędu z Zoda, ale opisany własnym typem — dzięki temu warstwa
 * formularzy nie zależy od wersji biblioteki walidującej.
 */
export type ValidationError = {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
};

/** Pierwszy błąd na pole — przy jednym polu więcej niż jeden i tak nie pomaga. */
export function fieldErrors<TField extends string>(
  error: ValidationError,
): Partial<Record<TField, string>> {
  const errors: Partial<Record<TField, string>> = {};
  for (const issue of error.issues) {
    const name = issue.path[0];
    if (typeof name === "string" && !(name in errors)) {
      errors[name as TField] = issue.message;
    }
  }
  return errors;
}

/** Surowe wartości z `FormData`, przycięte i uzupełnione o brakujące pola. */
export function readFormValues<TField extends string>(
  formData: FormData,
  names: readonly TField[],
): Record<TField, string> {
  const values = {} as Record<TField, string>;
  for (const name of names) {
    const value = formData.get(name);
    values[name] = typeof value === "string" ? value.trim() : "";
  }
  return values;
}

/**
 * Identyfikator wiersza z ukrytego pola. Brak znaczy „nowy wiersz", a wartość,
 * której nie da się odczytać jako dodatniej liczby całkowitej, traktujemy jak
 * brak — to dane od użytkownika, nawet gdy przyszły z pola ukrytego.
 */
export function readEntityId(formData: FormData, field: string): number | null {
  const value = formData.get(field);
  if (typeof value !== "string" || value.trim() === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
