import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FROM_PARAM,
  SEARCH_PARAM,
  TO_PARAM,
  hasAnyFilter,
  type FilterValues,
} from "@/lib/invoices/filters";

/**
 * Zwykły formularz `GET`: przeglądarka sama przepisuje pola do adresu, więc
 * filtry działają też zanim JavaScript się załaduje, a wynik da się dodać
 * do zakładek. `<details>` zwija panel bez klienta React.
 */
export function InvoiceFilters({ values }: { values: FilterValues }) {
  const filtered = hasAnyFilter(values);

  return (
    <Card className="gap-0 py-0">
      <details className="group" open={filtered || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            Szukaj
            {filtered ? (
              <span
                className="size-1.5 rounded-full bg-foreground"
                aria-label="Filtry aktywne"
              />
            ) : null}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <CardContent className="pb-4">
          <form method="get" action="/invoices" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-search" className="sr-only">
                Szukaj
              </Label>
              <Input
                id="filter-search"
                name={SEARCH_PARAM}
                type="search"
                defaultValue={values.search}
                placeholder="Numer faktury albo nazwa odbiorcy"
                className="h-12 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="filter-from" className="text-sm">
                  Od
                </Label>
                <Input
                  id="filter-from"
                  name={FROM_PARAM}
                  type="date"
                  defaultValue={values.from}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-to" className="text-sm">
                  Do
                </Label>
                <Input
                  id="filter-to"
                  name={TO_PARAM}
                  type="date"
                  defaultValue={values.to}
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="h-11 flex-1 text-base">
                <Search className="size-5" />
                Pokaż
              </Button>
              {filtered ? (
                <Button asChild variant="outline" className="h-11 text-base">
                  <Link href="/invoices">
                    <X className="size-5" />
                    Wyczyść
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </details>
    </Card>
  );
}
