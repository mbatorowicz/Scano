/**
 * Filtry listy faktur siedzą w adresie URL, żeby dało się je odświeżyć,
 * cofnąć i wysłać komuś linkiem. Te same nazwy parametrów czyta strona listy
 * i eksport CSV, dlatego stoją w jednym miejscu.
 */
import type { InvoiceFilters } from "@/lib/db/queries";

export const FROM_PARAM = "od";
export const TO_PARAM = "do";
export const SEARCH_PARAM = "szukaj";

export type FilterValues = {
  from: string;
  to: string;
  search: string;
};

export const EMPTY_FILTER_VALUES: FilterValues = { from: "", to: "", search: "" };

type RawSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() : "";
}

export function readFilterValues(params: RawSearchParams): FilterValues {
  return {
    from: single(params[FROM_PARAM]),
    to: single(params[TO_PARAM]),
    search: single(params[SEARCH_PARAM]),
  };
}

/** Zapytania do bazy same odsiewają daty, których nie da się użyć. */
export function toInvoiceFilters(values: FilterValues): InvoiceFilters {
  return {
    from: values.from || null,
    to: values.to || null,
    search: values.search || null,
  };
}

export function hasAnyFilter(values: FilterValues): boolean {
  return values.from !== "" || values.to !== "" || values.search !== "";
}

/** Parametry do doklejenia do adresu, np. przy eksporcie aktualnej listy. */
export function toQueryString(values: FilterValues): string {
  const params = new URLSearchParams();
  if (values.from) params.set(FROM_PARAM, values.from);
  if (values.to) params.set(TO_PARAM, values.to);
  if (values.search) params.set(SEARCH_PARAM, values.search);

  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}
