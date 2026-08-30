import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, LogOut } from "lucide-react";

import { SummaryStat } from "@/components/summary-stat";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMonthlyAiUsage, getTodayModelUsage } from "@/lib/ai-usage/service";
import { FREE_TIER_DAILY_LIMIT } from "@/lib/config";

import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Ustawienia",
};

const numberFormat = new Intl.NumberFormat("pl-PL");

export default async function SettingsPage() {
  const [usage, today] = await Promise.all([
    getMonthlyAiUsage(),
    getTodayModelUsage(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">
          Zużycie AI i dostęp do aplikacji.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Zużycie AI</CardTitle>
          <CardDescription>
            Darmowy plan daje {FREE_TIER_DAILY_LIMIT} odczytów na dobę, liczonych
            osobno dla każdego modelu. Ponowne wysłanie tego samego zdjęcia oraz
            ręczne wpisanie faktury nie zużywają nic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Dzisiaj</p>
            {today.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Dziś nie było jeszcze żadnego odczytu.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {today.map((row) => (
                  <li key={row.model} className="flex justify-between gap-2">
                    <span className="truncate text-muted-foreground">{row.model}</span>
                    <span className="shrink-0 font-medium">
                      {row.scans} / {row.limit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {usage.scans === 0 ? null : (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">W tym miesiącu</p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <SummaryStat
                  variant="definition"
                  label="Odczytów"
                  value={numberFormat.format(usage.scans)}
                />
                <SummaryStat
                  variant="definition"
                  label="Tokenów"
                  value={numberFormat.format(usage.totalTokens)}
                />
                <SummaryStat
                  variant="definition"
                  label="Średnio na odczyt"
                  value={numberFormat.format(usage.averageTokens)}
                />
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontrahenci</CardTitle>
          <CardDescription>
            Słownik nabywców. Sprzedawca jest zawsze Pecet. Poprawiona nazwa
            wraca przy skanie i widać ją na wszystkich fakturach tej firmy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/contractors"
            className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 ring-1 ring-foreground/10"
          >
            <Building2 className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">Lista kontrahentów</span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesja</CardTitle>
          <CardDescription>
            Wylogowanie usuwa ciasteczko sesji z tego urządzenia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button type="submit" variant="outline" className="h-12 text-base">
              <LogOut className="size-5" />
              Wyloguj
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
