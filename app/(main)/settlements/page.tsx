import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { getBalance, listSettlements } from "@/lib/db/queries";
import { formatCurrency, toMinorUnits } from "@/lib/money";

import { DeleteSettlement } from "./delete-settlement";
import { SettlementForm } from "./settlement-form";

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
            <Summary label="Zarobione" value={formatCurrency(balance.earned)} />
            <Summary label="Wypłacone" value={formatCurrency(balance.paid)} />
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
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(settlement.settledOn)}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(settlement.amount)}
                    </span>
                  </div>
                  {settlement.note === null ? null : (
                    <p className="truncate text-sm text-muted-foreground">
                      {settlement.note}
                    </p>
                  )}
                </div>
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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
