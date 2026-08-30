import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * `error` to coś, co się nie udało; `warning` to coś, co się uda, ale wymaga
 * decyzji użytkownika — na przykład zapis faktury, która wygląda na duplikat.
 */
export type AlertTone = "error" | "warning";

export function Alert({
  tone,
  className,
  children,
}: {
  tone: AlertTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg px-4 py-3 text-sm",
        tone === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-3">{children}</div>
    </div>
  );
}
