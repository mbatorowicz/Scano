"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { initialLoginState, login } from "./actions";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(
    login,
    initialLoginState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="dalej" value={redirectTo} />

      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="h-12 text-base"
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="h-12 w-full text-base" disabled={isPending}>
        {isPending ? (
          <>
            <LoaderCircle className="animate-spin" />
            Sprawdzam…
          </>
        ) : (
          "Wejdź"
        )}
      </Button>
    </form>
  );
}
