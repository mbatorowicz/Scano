/** Daty krążą po aplikacji jako `RRRR-MM-DD` — tak trzyma je kolumna `date` i `<input type="date">`. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Prawdziwa data w zapisie ISO. `2026-02-30` pasuje do wzorca, ale nie istnieje. */
export function isIsoDate(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;

  const match = ISO_DATE.exec(value.trim());
  if (match === null) return false;

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
}

/** Dzisiejsza data z zegara urządzenia, nie z UTC — o 1 w nocy to jeszcze dziś. */
export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `2026-08-12` na `12.08.2026` — zapis, w jakim data stoi na fakturze. */
export function formatDate(value: string | null | undefined): string {
  if (!isIsoDate(value)) return "—";
  const [year, month, day] = (value as string).trim().split("-");
  return `${day}.${month}.${year}`;
}
