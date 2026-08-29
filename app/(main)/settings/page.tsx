import type { Metadata } from "next";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FREE_TIER_DAILY_LIMIT } from "@/lib/ai/extract-invoice";
import {
  getAiUsageByModel,
  getAiUsageSummary,
  getSettings,
} from "@/lib/db/queries";
import { formatRateValue } from "@/lib/money";

import { logout } from "./actions";
import { FeeRateForm } from "./fee-rate-form";

export const metadata: Metadata = {
  title: "Ustawienia",
};

function startOfMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Limit odczytów zeruje się co dobę, więc liczymy od północy czasu urządzenia. */
function startOfDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const liczba = new Intl.NumberFormat("pl-PL");

export default async function SettingsPage() {
  const { feeRate } = await getSettings();
  const usage = await getAiUsageSummary(startOfMonth());
  const today = await getAiUsageByModel(startOfDay());

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">
          Stawka prowizji i dostęp do aplikacji.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Prowizja</CardTitle>
          <CardDescription>
            Zmiana dotyczy tylko faktur zapisanych od tej chwili. Każda faktura
            trzyma stawkę, którą policzono ją przy zapisie, więc historia zostaje
            nietknięta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeeRateForm feeRate={formatRateValue(feeRate)} />
        </CardContent>
      </Card>

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
                      {row.scans} / {FREE_TIER_DAILY_LIMIT}
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
                <Usage label="Odczytów" value={liczba.format(usage.scans)} />
                <Usage label="Tokenów" value={liczba.format(usage.totalTokens)} />
                <Usage
                  label="Średnio na odczyt"
                  value={liczba.format(usage.averageTokens)}
                />
              </dl>
            </div>
          )}
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

function Usage({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
