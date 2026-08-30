import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DeleteSettlement } from "@/components/settlements/delete-settlement";
import { SettlementForm } from "@/components/settlements/settlement-form";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { formatAmount } from "@/lib/money";
import { toSettlementFormValues } from "@/lib/settlements/form";
import { getSettlement } from "@/lib/settlements/repository";

export const metadata: Metadata = {
  title: "Wypłata",
};

function settlementId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function SettlementPage(
  props: PageProps<"/settlements/[id]">,
) {
  const { id } = await props.params;
  const parsedId = settlementId(id);
  if (parsedId === null) notFound();

  const settlement = await getSettlement(parsedId);
  if (settlement === null) notFound();

  // Kwota wraca z bazy jako "1000.00", a w formularzu ma wyglądać tak, jak się
  // ją wpisuje.
  const values = toSettlementFormValues({
    settledOn: settlement.settledOn,
    amount: formatAmount(settlement.amount),
    note: settlement.note,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" className="h-11 text-base">
          <Link href="/settlements">
            <ArrowLeft className="size-5" />
            Rozliczenia
          </Link>
        </Button>
        <DeleteSettlement
          id={settlement.id}
          settledOn={settlement.settledOn}
          amount={settlement.amount}
        />
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Wypłata z {formatDate(settlement.settledOn)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Zmiana kwoty albo daty od razu przeliczy saldo.
        </p>
      </header>

      <SettlementForm
        settlementId={settlement.id}
        initialValues={values}
        title="Poprawiona wypłata"
        submitLabel="Zapisz zmiany"
        redirectTo="/settlements"
      />
    </div>
  );
}
