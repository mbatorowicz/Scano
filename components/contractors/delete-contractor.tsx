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
import { removeContractor } from "@/lib/contractors/actions";
import { CONTRACTOR_ID_FIELD } from "@/lib/contractors/form";

export function DeleteContractor({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="h-11 text-base">
          <Trash2 className="size-5" />
          Usuń
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usunąć {name}?</DialogTitle>
          <DialogDescription>
            Zniknie ze słownika. Tego nie da się cofnąć. Firm z fakturami nie
            usuwamy — najpierw trzeba przepisać albo skasować te dokumenty.
          </DialogDescription>
        </DialogHeader>
        <form action={removeContractor}>
          <input type="hidden" name={CONTRACTOR_ID_FIELD} value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 text-base">
                Zostaw
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-11 text-base">
              <Trash2 className="size-5" />
              Usuń kontrahenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
