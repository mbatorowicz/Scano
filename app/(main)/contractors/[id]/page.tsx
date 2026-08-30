import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ContractorForm } from "@/components/contractors/contractor-form";
import { DeleteContractor } from "@/components/contractors/delete-contractor";
import { Button } from "@/components/ui/button";
import { toContractorFormValues } from "@/lib/contractors/form";
import { countInvoicesForContractor, getContractor } from "@/lib/contractors/repository";

export const metadata: Metadata = {
  title: "Kontrahent",
};

function contractorId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function ContractorPage(
  props: PageProps<"/contractors/[id]">,
) {
  const { id } = await props.params;
  const parsedId = contractorId(id);
  if (parsedId === null) notFound();

  const contractor = await getContractor(parsedId);
  if (contractor === null) notFound();

  const invoiceCount = await countInvoicesForContractor(contractor.id);
  const values = toContractorFormValues({
    name: contractor.name,
    nip: contractor.nip,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" className="h-11 text-base">
          <Link href="/contractors">
            <ArrowLeft className="size-5" />
            Kontrahenci
          </Link>
        </Button>
        {invoiceCount === 0 ? (
          <DeleteContractor id={contractor.id} name={contractor.name} />
        ) : null}
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {contractor.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invoiceCount === 0
            ? "Nie ma jeszcze żadnej faktury tej firmy — można ją usunąć."
            : "Zmiana nazwy od razu widać na wszystkich fakturach i w eksporcie."}
        </p>
      </header>

      <ContractorForm contractorId={contractor.id} initialValues={values} />
    </div>
  );
}
