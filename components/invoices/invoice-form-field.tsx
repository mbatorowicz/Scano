"use client";

import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REQUIRED_INVOICE_FIELDS } from "@/lib/invoices/form";
import type { InvoiceFieldConfig } from "@/lib/invoices/form-fields";
import { cn } from "@/lib/utils";

export function InvoiceFormField({
  field,
  value,
  onChange,
  error,
  missing,
  disabled,
  required = REQUIRED_INVOICE_FIELDS.includes(field.name),
  children,
}: {
  field: InvoiceFieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** AI nie odczytała tego pola — zostaje wyraźna adnotacja, żeby go nie przeoczyć. */
  missing: boolean;
  disabled: boolean;
  required?: boolean;
  children?: ReactNode;
}) {
  const id = `invoice-${field.name}`;
  const hintId = `${id}-hint`;
  const hint = error ?? (missing ? "AI tego nie odczytało — uzupełnij." : null);

  return (
    <div className={cn("space-y-2", field.wide && "sm:col-span-2")}>
      <Label htmlFor={id} className="text-sm">
        {field.label}
        {required ? null : (
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
            error === undefined
              ? "text-amber-600 dark:text-amber-500"
              : "text-destructive",
          )}
        >
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}
