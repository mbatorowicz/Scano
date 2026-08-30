import type { Metadata } from "next";
import Link from "next/link";

import { DeleteSettlement } from "@/components/settlements/delete-settlement";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { SummaryStat } from "@/components/summary-stat";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { formatCurrency, toMinorUnits } from "@/lib/money";
import { getBalance, listSettlements } from "@/lib/settlements/repository";

export const metadata: Metadata = {
  title: "Rozliczenia",
};

export default async function SettlementsPage() {
  const [balance, settlements] = await Promise.all([
    getBalance(),
    listSettlements(),
  ]);

  // Ujemne saldo znaczy, że dostałem z góry — to normalny stan, nie błąd.
  const overpaid = (toMinorUnits(balance.outstanding) ?? 0n) < 0n;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Rozliczenia</h1>
        <p className="text-sm text-muted-foreground">
          Wypłaty należności i to, co zostało do wypłaty. Saldo liczy się ze
          wszystkich faktur, niezależnie od filtrów na liście.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <SummaryStat
              label="Zarobione"
              value={formatCurrency(balance.earned)}
            />
            <SummaryStat
              label="Wypłacone"
              value={formatCurrency(balance.paid)}
            />
          </div>
          <div className="border-t pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {overpaid ? "Wypłacone z góry" : "Do wypłaty"}
            </p>
            <p className="text-3xl font-semibold tracking-tight">
              {formatCurrency(balance.outstanding)}
            </p>
          </div>
        </CardContent>
      </Card>

      <SettlementForm />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Historia wypłat</h2>
        {settlements.length === 0 ? null : (
          <p className="text-xs text-muted-foreground">
            Dotknij wypłaty, żeby poprawić kwotę albo datę.
          </p>
        )}
        {settlements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nie ma tu jeszcze żadnej wypłaty.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {settlements.map((settlement) => (
              <li
                key={settlement.id}
                className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
              >
                <Link
                  href={`/settlements/${settlement.id}`}
                  className="min-w-0 flex-1 space-y-1"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(settlement.settledOn)}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(settlement.amount)}
                    </span>
                  </span>
                  {settlement.note === null ? null : (
                    <span className="block truncate text-sm text-muted-foreground">
                      {settlement.note}
                    </span>
                  )}
                </Link>
                <DeleteSettlement
                  id={settlement.id}
                  settledOn={settlement.settledOn}
                  amount={settlement.amount}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
