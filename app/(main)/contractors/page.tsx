import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { listContractors } from "@/lib/contractors/repository";

export const metadata: Metadata = {
  title: "Kontrahenci",
};

function invoiceCountLabel(count: number): string {
  const rest = count % 10;
  const tens = count % 100;
  if (count === 1) return "1 faktura";
  if (rest >= 2 && rest <= 4 && (tens < 10 || tens >= 20)) {
    return `${count} faktury`;
  }
  return `${count} faktur`;
}

export default async function ContractorsPage() {
  const contractors = await listContractors();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kontrahenci</h1>
        <p className="text-sm text-muted-foreground">
          Sprzedawcy i nabywcy z faktur. Poprawiona nazwa wraca przy następnym
          skanie i widać ją na wszystkich dokumentach tej firmy.
        </p>
      </header>

      {contractors.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nie ma tu jeszcze żadnego kontrahenta. Pojawi się po zapisaniu
            pierwszej faktury.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {contractors.map((contractor) => (
            <li key={contractor.id}>
              <Link
                href={`/contractors/${contractor.id}`}
                className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
              >
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate font-medium">
                    {contractor.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {contractor.nip ?? "bez NIP-u"} ·{" "}
                    {invoiceCountLabel(contractor.invoiceCount)}
                  </span>
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
