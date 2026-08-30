"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { removeSettlement } from "@/lib/settlements/actions";
import { SETTLEMENT_ID_FIELD } from "@/lib/settlements/form";

export function DeleteSettlement({
  id,
  settledOn,
  amount,
}: {
  id: number;
  settledOn: string;
  amount: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground"
          aria-label={`Usuń wypłatę ${formatCurrency(amount)} z ${formatDate(settledOn)}`}
        >
          <Trash2 className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usunąć wypłatę {formatCurrency(amount)}?</DialogTitle>
          <DialogDescription>
            Wypłata z {formatDate(settledOn)} zniknie z historii, a saldo urośnie
            o tę kwotę. Tego nie da się cofnąć.
          </DialogDescription>
        </DialogHeader>
        <form action={removeSettlement}>
          <input type="hidden" name={SETTLEMENT_ID_FIELD} value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 text-base">
                Zostaw
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-11 text-base">
              <Trash2 className="size-5" />
              Usuń wypłatę
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
