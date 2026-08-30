"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * Ostatnia siatka bezpieczeństwa: awaria w samym korzeniu, więc zwykły layout
 * nie działa i trzeba oddać własne `html` razem ze stylami. Bez przycisku
 * „spróbuj ponownie" zostaje tylko przeładowanie strony.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Awaria aplikacji", error);
  }, [error]);

  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Scano się zatrzymało
          </h1>
          <p className="text-sm text-muted-foreground">
            Aplikacja nie zdołała się uruchomić. Zapisane faktury nic z tego nie
            tracą.
          </p>
          {error.digest === undefined ? null : (
            <p className="font-mono text-xs text-muted-foreground">
              Numer zgłoszenia: {error.digest}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={reset}
          className="h-12 rounded-md bg-primary px-6 text-base font-medium text-primary-foreground"
        >
          Spróbuj ponownie
        </button>
      </body>
    </html>
  );
}
