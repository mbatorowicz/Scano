"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FEE_RATE_FIELD,
  INITIAL_SETTINGS_FORM_STATE,
} from "@/lib/settings-form";

import { saveFeeRate } from "./actions";

export function FeeRateForm({ feeRate }: { feeRate: string }) {
  const [state, formAction, isPending] = useActionState(
    saveFeeRate,
    INITIAL_SETTINGS_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fee-rate" className="text-sm">
          Stawka w procentach
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="fee-rate"
            name={FEE_RATE_FIELD}
            inputMode="decimal"
            defaultValue={feeRate}
            aria-invalid={state.status === "error"}
            aria-describedby={state.message === null ? undefined : "fee-rate-status"}
            className="h-12 max-w-32 text-base"
          />
          <span className="text-base text-muted-foreground">%</span>
        </div>
      </div>

      {state.message === null ? null : (
        <p
          id="fee-rate-status"
          role="status"
          className={cn(
            "text-sm",
            state.status === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" className="h-12 text-base" disabled={isPending}>
        {isPending ? (
          <>
            <LoaderCircle className="size-5 animate-spin" />
            Zapisuję…
          </>
        ) : (
          <>
            <Save className="size-5" />
            Zapisz stawkę
          </>
        )}
      </Button>
    </form>
  );
}
