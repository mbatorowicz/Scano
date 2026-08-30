"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayIso } from "@/lib/dates";
import { formatAmount } from "@/lib/money";
import { saveSettlement } from "@/lib/settlement-actions";
import {
  INITIAL_SETTLEMENT_FORM_STATE,
  QUICK_AMOUNTS,
} from "@/lib/settlement-form";

/**
 * Pola są niekontrolowane: po odrzuceniu przez walidację wpisane wartości mają
 * zostać na miejscu, a przyciski stałych kwot wpisują je wprost do pola.
 */
export function SettlementForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    saveSettlement,
    INITIAL_SETTLEMENT_FORM_STATE,
  );

  // Dzisiejszą datę bierzemy z zegara urządzenia dopiero w przeglądarce: serwer
  // chodzi na UTC, więc o 1 w nocy podstawiłby wczorajszy dzień.
  useEffect(() => {
    setToday(dateRef.current);
  }, []);

  useEffect(() => {
    if (state.status === "saved") {
      toast.success(state.message ?? "Zapisano.");
      formRef.current?.reset();
      setToday(dateRef.current);
      return;
    }
    if (state.status === "error" && state.message !== null) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nowa wypłata</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settlement-settledOn" className="text-sm">
              Data wypłaty
            </Label>
            <Input
              ref={dateRef}
              id="settlement-settledOn"
              name="settledOn"
              type="date"
              disabled={isPending}
              aria-invalid={state.fieldErrors.settledOn !== undefined}
              aria-describedby={describedBy("settledOn", state.fieldErrors.settledOn)}
              className="h-12 text-base"
            />
            <FieldError name="settledOn" message={state.fieldErrors.settledOn} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlement-amount" className="text-sm">
              Kwota
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((quick) => (
                <Button
                  key={quick}
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 text-base"
                  disabled={isPending}
                  onClick={() => {
                    if (amountRef.current !== null) {
                      amountRef.current.value = quick;
                    }
                  }}
                >
                  {formatAmount(quick)}
                </Button>
              ))}
            </div>
            <Input
              ref={amountRef}
              id="settlement-amount"
              name="amount"
              inputMode="decimal"
              placeholder="1000,00"
              disabled={isPending}
              aria-invalid={state.fieldErrors.amount !== undefined}
              aria-describedby={describedBy("amount", state.fieldErrors.amount)}
              className="h-12 text-base"
            />
            <FieldError name="amount" message={state.fieldErrors.amount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlement-note" className="text-sm">
              Notatka{" "}
              <span className="font-normal text-muted-foreground">
                (opcjonalne)
              </span>
            </Label>
            <Input
              id="settlement-note"
              name="note"
              placeholder="gotówka, przelew…"
              disabled={isPending}
              aria-invalid={state.fieldErrors.note !== undefined}
              aria-describedby={describedBy("note", state.fieldErrors.note)}
              className="h-12 text-base"
            />
            <FieldError name="note" message={state.fieldErrors.note} />
          </div>

          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <LoaderCircle className="size-5 animate-spin" />
                Zapisuję…
              </>
            ) : (
              <>
                <Plus className="size-5" />
                Zapisz wypłatę
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function setToday(input: HTMLInputElement | null) {
  if (input !== null && input.value === "") input.value = todayIso();
}

function errorId(name: string): string {
  return `settlement-${name}-error`;
}

function describedBy(name: string, message?: string): string | undefined {
  return message === undefined ? undefined : errorId(name);
}

function FieldError({ name, message }: { name: string; message?: string }) {
  if (message === undefined) return null;
  return (
    <p id={errorId(name)} className="text-sm text-destructive">
      {message}
    </p>
  );
}
