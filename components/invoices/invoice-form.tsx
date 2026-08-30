"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { InvoiceFormField } from "@/components/invoices/invoice-form-field";
import { InvoicePhoto } from "@/components/invoices/invoice-photo";
import { PayoutHint } from "@/components/invoices/payout-hint";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DUPLICATE_CONFIRM_FIELD,
  DUPLICATE_CONFIRMED_VALUE,
  IMAGE_PATHNAME_FIELD,
  INITIAL_INVOICE_FORM_STATE,
  INVOICE_ID_FIELD,
  type InvoiceFieldName,
  type InvoiceFormState,
  type InvoiceFormValues,
} from "@/lib/invoices/form";
import { INVOICE_FORM_SECTIONS } from "@/lib/invoices/form-fields";

export function InvoiceForm({
  action,
  initialValues,
  invoiceId,
  imagePathname,
  imageSrc,
  missingFields = [],
  submitLabel = "Zapisz fakturę",
  redirectTo = "/invoices",
}: {
  action: (
    state: InvoiceFormState,
    formData: FormData,
  ) => Promise<InvoiceFormState>;
  initialValues: InvoiceFormValues;
  invoiceId?: number;
  imagePathname?: string | null;
  /** Adres miniatury: lokalne zdjęcie ze skanu albo trasa `/api/image`. */
  imageSrc?: string | null;
  /** Pola, których AI nie odczytała — dostają wyraźną adnotację. */
  missingFields?: readonly InvoiceFieldName[];
  submitLabel?: string;
  /** Dokąd wracamy po udanym zapisie. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(initialValues);
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_INVOICE_FORM_STATE,
  );

  useEffect(() => {
    if (state.status === "saved") {
      toast.success(state.message ?? "Zapisano.");
      router.push(redirectTo);
      return;
    }
    if (state.status === "error" && state.message !== null) {
      toast.error(state.message);
    }
  }, [state, router, redirectTo]);

  // Po zapisie trwa jeszcze nawigacja, a formularz nie jest już „w toku" —
  // bez tego dałoby się kliknąć zapis drugi raz i dodać fakturę dwa razy.
  const busy = isPending || state.status === "saved";

  function setValue(name: InvoiceFieldName, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  /** Zapis mimo ostrzeżenia o duplikacie — ta sama akcja, tylko z potwierdzeniem. */
  function saveAnyway() {
    const form = formRef.current;
    if (form === null) return;

    const formData = new FormData(form);
    formData.set(DUPLICATE_CONFIRM_FIELD, DUPLICATE_CONFIRMED_VALUE);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {invoiceId === undefined ? null : (
        <input type="hidden" name={INVOICE_ID_FIELD} value={invoiceId} />
      )}
      {imagePathname ? (
        <input type="hidden" name={IMAGE_PATHNAME_FIELD} value={imagePathname} />
      ) : null}

      {imageSrc ? <InvoicePhoto src={imageSrc} /> : null}

      {INVOICE_FORM_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <InvoiceFormField
                key={field.name}
                field={field}
                value={values[field.name]}
                onChange={(value) => setValue(field.name, value)}
                error={state.fieldErrors[field.name]}
                missing={
                  missingFields.includes(field.name) &&
                  values[field.name].length === 0
                }
                disabled={busy}
              >
                {field.name === "costAmount" ? (
                  <PayoutHint
                    grossAmount={values.grossAmount}
                    costAmount={values.costAmount}
                  />
                ) : null}
              </InvoiceFormField>
            ))}
          </CardContent>
        </Card>
      ))}

      {(state.status === "invalid" || state.status === "error") &&
      state.message !== null ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}

      {state.status === "duplicate" ? (
        <Alert tone="warning">
          <p>{state.message}</p>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full text-base sm:w-auto"
            onClick={saveAnyway}
            disabled={busy}
          >
            Zapisz mimo to
          </Button>
        </Alert>
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
            {submitLabel}
          </>
        )}
      </Button>
    </form>
  );
}
