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
import { removeInvoice } from "@/lib/invoices/actions";
import { INVOICE_ID_FIELD } from "@/lib/invoices/form";

export function DeleteInvoice({
  id,
  invoiceNumber,
}: {
  id: number;
  invoiceNumber: string;
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
          <DialogTitle>Usunąć fakturę {invoiceNumber}?</DialogTitle>
          <DialogDescription>
            Zniknie z listy razem ze zdjęciem, a sumy przeliczą się bez niej.
            Tego nie da się cofnąć.
          </DialogDescription>
        </DialogHeader>
        <form action={removeInvoice}>
          <input type="hidden" name={INVOICE_ID_FIELD} value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 text-base">
                Zostaw
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-11 text-base">
              <Trash2 className="size-5" />
              Usuń fakturę
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
