"use client";

import { INCOME_TAX_PERCENT, VAT_PERCENT } from "@/lib/config";
import { formatCurrency } from "@/lib/money";
import { calculatePayout } from "@/lib/payout";

/**
 * Należność liczona na żywo pod polem ceny. Do bazy trafia wynik policzony na
 * serwerze — ten sam wzór, ale bez zaufania do tego, co przyszło z formularza.
 */
export function PayoutHint({
  grossAmount,
  costAmount,
}: {
  grossAmount: string;
  costAmount: string;
}) {
  const payout = calculatePayout(grossAmount, costAmount);

  return (
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
  );
}
