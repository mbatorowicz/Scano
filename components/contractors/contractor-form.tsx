"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveContractor } from "@/lib/contractors/actions";
import {
  CONTRACTOR_ID_FIELD,
  INITIAL_CONTRACTOR_FORM_STATE,
  type ContractorFormValues,
} from "@/lib/contractors/form";

export function ContractorForm({
  contractorId,
  initialValues,
}: {
  contractorId: number;
  initialValues: ContractorFormValues;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    saveContractor,
    INITIAL_CONTRACTOR_FORM_STATE,
  );

  useEffect(() => {
    if (state.status === "saved") {
      toast.success(state.message ?? "Zapisano.");
      router.push("/contractors");
      return;
    }
    if (state.status === "error" && state.message !== null) {
      toast.error(state.message);
    }
  }, [state, router]);

  const busy = isPending || state.status === "saved";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dane firmy</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name={CONTRACTOR_ID_FIELD} value={contractorId} />

          <div className="space-y-2">
            <Label htmlFor="contractor-name" className="text-sm">
              Nazwa
            </Label>
            <Input
              id="contractor-name"
              name="name"
              defaultValue={initialValues.name}
              disabled={busy}
              aria-invalid={state.fieldErrors.name !== undefined}
              className="h-12 text-base"
            />
            {state.fieldErrors.name === undefined ? null : (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractor-nip" className="text-sm">
              NIP{" "}
              <span className="font-normal text-muted-foreground">
                (opcjonalne)
              </span>
            </Label>
            <Input
              id="contractor-nip"
              name="nip"
              inputMode="numeric"
              placeholder="opcjonalnie"
              defaultValue={initialValues.nip}
              disabled={busy}
              aria-invalid={state.fieldErrors.nip !== undefined}
              className="h-12 text-base"
            />
            {state.fieldErrors.nip === undefined ? null : (
              <p className="text-sm text-destructive">{state.fieldErrors.nip}</p>
            )}
          </div>

          {state.status === "invalid" && state.message !== null ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}

          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="size-5 animate-spin" />
                Zapisuję…
              </>
            ) : (
              <>
                <Save className="size-5" />
                Zapisz zmiany
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
