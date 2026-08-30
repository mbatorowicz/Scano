"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LoaderCircle, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DUPLICATE_CONFIRM_FIELD,
  DUPLICATE_CONFIRMED_VALUE,
  IMAGE_PATHNAME_FIELD,
  INITIAL_INVOICE_FORM_STATE,
  INVOICE_ID_FIELD,
  REQUIRED_INVOICE_FIELDS,
  type InvoiceFieldName,
  type InvoiceFormState,
  type InvoiceFormValues,
} from "@/lib/invoice-form";
import { formatCurrency } from "@/lib/money";
import {
  calculatePayout,
  INCOME_TAX_PERCENT,
  VAT_PERCENT,
} from "@/lib/payout";
import { cn } from "@/lib/utils";

type Field = {
  name: InvoiceFieldName;
  label: string;
  type?: "text" | "date";
  inputMode?: "text" | "numeric" | "decimal";
  placeholder?: string;
  wide?: boolean;
};

type Section = {
  title: string;
  fields: Field[];
};

const SECTIONS: Section[] = [
  {
    title: "Dokument",
    fields: [
      { name: "invoiceNumber", label: "Numer faktury", placeholder: "0350/2026" },
      { name: "issueDate", label: "Data wystawienia", type: "date" },
    ],
  },
  {
    title: "Strony",
    fields: [
      { name: "sellerName", label: "Sprzedawca", wide: true },
      {
        name: "sellerNip",
        label: "NIP sprzedawcy",
        inputMode: "numeric",
        placeholder: "opcjonalnie",
      },
      { name: "buyerName", label: "Nabywca", wide: true },
      {
        name: "buyerNip",
        label: "NIP nabywcy",
        inputMode: "numeric",
        placeholder: "opcjonalnie",
      },
    ],
  },
  {
    title: "Kwoty",
    fields: [
      {
        name: "grossAmount",
        label: "Wartość brutto",
        inputMode: "decimal",
        placeholder: "1234,56",
        wide: true,
      },
      { name: "netAmount", label: "Netto", inputMode: "decimal", placeholder: "opcjonalnie" },
      { name: "vatAmount", label: "VAT", inputMode: "decimal", placeholder: "opcjonalnie" },
      {
        name: "costAmount",
        label: "Cena dla mnie",
        inputMode: "decimal",
        placeholder: "0,00",
        wide: true,
      },
    ],
  },
];

type InvoiceFormProps = {
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
};

export function InvoiceForm({
  action,
  initialValues,
  invoiceId,
  imagePathname,
  imageSrc,
  missingFields = [],
  submitLabel = "Zapisz fakturę",
  redirectTo = "/",
}: InvoiceFormProps) {
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

  const payout = calculatePayout(values.grossAmount, values.costAmount);
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

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <FormField
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
                  <p className="text-sm text-muted-foreground">
                    {payout === null ? (
                      `Należność dla mnie policzy się z wartości brutto po VAT ${VAT_PERCENT}% i podatku ${INCOME_TAX_PERCENT}%.`
                    ) : (
                      <>
                        Należność dla mnie:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(payout)}
                        </span>{" "}
                        — po VAT {VAT_PERCENT}% i podatku {INCOME_TAX_PERCENT}%.
                      </>
                    )}
                  </p>
                ) : null}
              </FormField>
            ))}
          </CardContent>
        </Card>
      ))}

      {state.status === "invalid" && state.message !== null ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}

      {state.status === "error" && state.message !== null ? (
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

type FormFieldProps = {
  field: Field;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  missing: boolean;
  disabled: boolean;
  children?: ReactNode;
};

function FormField({
  field,
  value,
  onChange,
  error,
  missing,
  disabled,
  children,
}: FormFieldProps) {
  const id = `invoice-${field.name}`;
  const hintId = `${id}-hint`;
  const hint = error ?? (missing ? "AI tego nie odczytało — uzupełnij." : null);

  return (
    <div className={cn("space-y-2", field.wide && "sm:col-span-2")}>
      <Label htmlFor={id} className="text-sm">
        {field.label}
        {REQUIRED_INVOICE_FIELDS.includes(field.name) ? null : (
          <span className="font-normal text-muted-foreground">(opcjonalne)</span>
        )}
      </Label>
      <Input
        id={id}
        name={field.name}
        type={field.type ?? "text"}
        inputMode={field.inputMode}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error !== undefined}
        aria-describedby={hint === null ? undefined : hintId}
        className={cn(
          "h-12 text-base",
          missing && error === undefined && "border-amber-500",
        )}
      />
      {hint === null ? null : (
        <p
          id={hintId}
          className={cn(
            "text-sm",
            error === undefined ? "text-amber-600 dark:text-amber-500" : "text-destructive",
          )}
        >
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg px-4 py-3 text-sm",
        tone === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

/**
 * Miniatura do porównania z odczytem; po kliknięciu zdjęcie na cały ekran.
 * Zwykły `img`, a nie `next/image`: adres to albo lokalne `blob:` ze świeżo
 * zrobionego zdjęcia, albo prywatna trasa `/api/image` — optymalizator i tak
 * nie ma tu nic do roboty.
 */
function InvoicePhoto({ src }: { src: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left ring-1 ring-foreground/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Miniatura zeskanowanej faktury"
            className="h-20 w-16 shrink-0 rounded-md bg-muted object-cover"
          />
          <span className="text-sm text-muted-foreground">
            Zdjęcie faktury. Dotknij, żeby powiększyć i porównać z odczytem.
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-2xl">
        <DialogTitle>Zdjęcie faktury</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Zeskanowana faktura"
          className="max-h-[70vh] w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
