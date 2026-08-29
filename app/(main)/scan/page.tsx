import type { Metadata } from "next";

import { getSettings } from "@/lib/db/queries";
import { formatRate } from "@/lib/money";

import { ScanForm } from "./scan-form";

export const metadata: Metadata = {
  title: "Skanowanie",
};

export default async function ScanPage() {
  const { feeRate } = await getSettings();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Skanuj</h1>
        <p className="text-sm text-muted-foreground">
          Zrób zdjęcie faktury, a dane odczyta AI. Prowizja liczy się według
          stawki {formatRate(feeRate)}.
        </p>
      </header>

      <ScanForm feeRate={feeRate} />
    </div>
  );
}
