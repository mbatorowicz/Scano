"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayIso } from "@/lib/dates";
import { saveSettlement } from "@/lib/settlements/actions";
import {
  EMPTY_SETTLEMENT_FORM_VALUES,
  INITIAL_SETTLEMENT_FORM_STATE,
  SETTLEMENT_ID_FIELD,
  type SettlementFormValues,
} from "@/lib/settlements/form";

/**
 * Ten sam formularz dodaje wypłatę i poprawia zapisaną — różnicę robi
 * `settlementId`, dokładnie tak jak w formularzu faktury.
 *
 * Pola są niekontrolowane: po odrzuceniu przez walidację wpisane wartości mają
 * zostać na miejscu.
 */
export function SettlementForm({
  settlementId,
  initialValues = EMPTY_SETTLEMENT_FORM_VALUES,
  title = "Nowa wypłata",
  submitLabel = "Zapisz wypłatę",
  /** Ustawione znaczy „po zapisie odejdź stąd" — inaczej formularz się czyści. */
  redirectTo,
}: {
  settlementId?: number;
  initialValues?: SettlementFormValues;
  title?: string;
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
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
      if (redirectTo !== undefined) {
        router.push(redirectTo);
        return;
      }
      formRef.current?.reset();
      setToday(dateRef.current);
      return;
    }
    if (state.status === "error" && state.message !== null) {
      toast.error(state.message);
    }
  }, [state, router, redirectTo]);

  // Po zapisie trwa jeszcze nawigacja, a formularz nie jest już „w toku" —
  // bez tego dałoby się kliknąć zapis drugi raz.
  const busy = isPending || (redirectTo !== undefined && state.status === "saved");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          {settlementId === undefined ? null : (
            <input
              type="hidden"
              name={SETTLEMENT_ID_FIELD}
              value={settlementId}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="settlement-settledOn" className="text-sm">
              Data wypłaty
            </Label>
            <Input
              ref={dateRef}
              id="settlement-settledOn"
              name="settledOn"
              type="date"
              defaultValue={initialValues.settledOn}
              disabled={busy}
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
            <Input
              id="settlement-amount"
              name="amount"
              inputMode="decimal"
              placeholder="1000,00"
              defaultValue={initialValues.amount}
              disabled={busy}
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
              defaultValue={initialValues.note}
              disabled={busy}
              aria-invalid={state.fieldErrors.note !== undefined}
              aria-describedby={describedBy("note", state.fieldErrors.note)}
              className="h-12 text-base"
            />
            <FieldError name="note" message={state.fieldErrors.note} />
          </div>

          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="size-5 animate-spin" />
                Zapisuję…
              </>
            ) : (
              <>
                {settlementId === undefined ? (
                  <Plus className="size-5" />
                ) : (
                  <Save className="size-5" />
                )}
                {submitLabel}
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
