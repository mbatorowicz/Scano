"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Awaria wewnątrz zalogowanej części aplikacji: najczęściej baza nie odpowiada
 * albo zapis się nie udał. Nawigacja zostaje na miejscu, więc da się przejść
 * gdzie indziej bez przeładowania — a `reset` ponawia samo to, co się wysypało.
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Awaria ekranu", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Coś się zacięło</h1>
        <p className="text-sm text-muted-foreground">
          Nie udało się pokazać tego ekranu. Twoje faktury są bezpieczne — to
          zwykle chwilowa awaria połączenia z bazą.
        </p>
      </header>

      <Alert tone="error">
        <p>
          Spróbuj jeszcze raz. Jeśli błąd wraca, sprawdź połączenie z internetem.
        </p>
        {error.digest === undefined ? null : (
          <p className="font-mono text-xs opacity-70">
            Numer zgłoszenia: {error.digest}
          </p>
        )}
      </Alert>

      <Button onClick={reset} className="h-12 w-full text-base sm:w-auto">
        <RotateCcw className="size-5" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}
