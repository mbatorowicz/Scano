"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { PencilLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveContractor } from "@/lib/contractors/actions";
import {
  CONTRACTOR_ID_FIELD,
  INITIAL_CONTRACTOR_FORM_STATE,
  type ContractorOption,
} from "@/lib/contractors/form";
import { filterContractorSuggestions } from "@/lib/contractors/match-local";
import { REQUIRED_INVOICE_FIELDS } from "@/lib/invoices/form";
import type { InvoiceFieldConfig } from "@/lib/invoices/form-fields";
import { cn } from "@/lib/utils";

export function ContractorField({
  field,
  name,
  contractorId,
  contractors,
  onNameChange,
  onSelect,
  onRenamed,
  error,
  missing,
  disabled,
  required = REQUIRED_INVOICE_FIELDS.includes(field.name),
}: {
  field: InvoiceFieldConfig;
  name: string;
  contractorId: string;
  contractors: readonly ContractorOption[];
  onNameChange: (value: string) => void;
  onSelect: (contractor: ContractorOption) => void;
  onRenamed: (contractor: ContractorOption) => void;
  error?: string;
  missing: boolean;
  disabled: boolean;
  required?: boolean;
}) {
  const id = `invoice-${field.name}`;
  const listId = useId();
  const hintId = `${id}-hint`;
  const [open, setOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const known = contractorId !== "";
  const suggestions = filterContractorSuggestions(name, contractors);
  const showList = open && !disabled && suggestions.length > 0;
  const status =
    name.trim() === ""
      ? null
      : known
        ? "z bazy"
        : "Tego kontrahenta nie ma jeszcze w bazie — dodam go przy zapisie.";
  const hint =
    error ??
    (missing ? "AI tego nie odczytało — uzupełnij." : status);

  return (
    <div className={cn("space-y-2", field.wide && "sm:col-span-2")}>
      <Label htmlFor={id} className="text-sm">
        {field.label}
        {required ? null : (
          <span className="font-normal text-muted-foreground">(opcjonalne)</span>
        )}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={field.name}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          placeholder="Zacznij pisać albo wybierz z listy"
          value={name}
          onChange={(event) => {
            onNameChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          disabled={disabled}
          aria-invalid={error !== undefined}
          aria-describedby={hint === null ? undefined : hintId}
          className={cn(
            "h-12 text-base",
            missing && error === undefined && "border-amber-500",
          )}
        />
        <input type="hidden" name={field.idField} value={contractorId} />
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl bg-popover p-1 ring-1 ring-foreground/10"
          >
            {suggestions.map((contractor) => (
              <li key={contractor.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={contractorId === String(contractor.id)}
                  className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(contractor);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{contractor.name}</span>
                  {contractor.nip === null ? null : (
                    <span className="text-muted-foreground">{contractor.nip}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {hint === null ? null : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p
            id={hintId}
            className={cn(
              "text-sm",
              error !== undefined
                ? "text-destructive"
                : missing || !known
                  ? "text-amber-600 dark:text-amber-500"
                  : "text-muted-foreground",
            )}
          >
            {hint}
          </p>
          {known && error === undefined && !missing ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-sm"
              disabled={disabled}
              onClick={() => setRenameOpen(true)}
            >
              <PencilLine className="size-4" />
              Popraw nazwę w bazie
            </Button>
          ) : null}
        </div>
      )}
      {renameOpen ? (
        <ContractorRenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          contractor={
            contractors.find((row) => String(row.id) === contractorId) ?? {
              id: Number(contractorId),
              name,
              nip: null,
            }
          }
          onRenamed={onRenamed}
        />
      ) : null}
    </div>
  );
}

function ContractorRenameDialog({
  open,
  onOpenChange,
  contractor,
  onRenamed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: ContractorOption;
  onRenamed: (contractor: ContractorOption) => void;
}) {
  const [name, setName] = useState(contractor.name);
  const [nip, setNip] = useState(contractor.nip ?? "");
  const [state, formAction, isPending] = useActionState(
    saveContractor,
    INITIAL_CONTRACTOR_FORM_STATE,
  );

  useEffect(() => {
    if (state.status !== "saved") return;
    toast.success(state.message ?? "Zmiany zapisane.");
    onRenamed({ id: contractor.id, name: name.trim(), nip: nip.trim() || null });
    onOpenChange(false);
  }, [state, contractor.id, name, nip, onRenamed, onOpenChange]);

  useEffect(() => {
    if (state.status === "error" && state.message !== null) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Popraw nazwę w bazie</DialogTitle>
          <DialogDescription>
            Nowa nazwa pojawi się na wszystkich fakturach tej firmy, także
            wcześniejszych.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name={CONTRACTOR_ID_FIELD} value={contractor.id} />
          <div className="space-y-2">
            <Label htmlFor={`rename-${contractor.id}-name`} className="text-sm">
              Nazwa
            </Label>
            <Input
              id={`rename-${contractor.id}-name`}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
              aria-invalid={state.fieldErrors.name !== undefined}
              className="h-12 text-base"
            />
            {state.fieldErrors.name === undefined ? null : (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`rename-${contractor.id}-nip`} className="text-sm">
              NIP{" "}
              <span className="font-normal text-muted-foreground">
                (opcjonalne)
              </span>
            </Label>
            <Input
              id={`rename-${contractor.id}-nip`}
              name="nip"
              inputMode="numeric"
              value={nip}
              onChange={(event) => setNip(event.target.value)}
              disabled={isPending}
              aria-invalid={state.fieldErrors.nip !== undefined}
              className="h-12 text-base"
            />
            {state.fieldErrors.nip === undefined ? null : (
              <p className="text-sm text-destructive">{state.fieldErrors.nip}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 text-base"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Zostaw
            </Button>
            <Button type="submit" className="h-11 text-base" disabled={isPending}>
              Zapisz w bazie
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
