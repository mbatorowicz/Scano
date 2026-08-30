/**
 * NIP krąży po aplikacji jako same cyfry — ten sam numer wpisany z kreskami,
 * spacjami i bez nich ma być jednym wpisem w bazie.
 */

/** Polski NIP ma dokładnie tyle cyfr. */
export const NIP_LENGTH = 10;

/** Same cyfry z tego, co wpisał użytkownik; pusto znaczy „nie podano". */
export function nipDigits(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 0 ? null : digits;
}

/**
 * Cyfry tylko wtedy, gdy układają się w prawdziwy NIP. Inna długość to pomyłka
 * w odczycie, a nie numer — zapisanie jej byłoby gorsze niż pusta wartość.
 */
export function validNip(value: string | null | undefined): string | null {
  const digits = nipDigits(value);
  return digits?.length === NIP_LENGTH ? digits : null;
}
