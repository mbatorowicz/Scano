/**
 * Liczba z podpisem — kafelek w podsumowaniach nad listą faktur, w saldzie
 * rozliczeń i w zużyciu AI.
 */
export function SummaryStat({
  label,
  value,
  /** W `dl` para musi być `dt` i `dd`, inaczej lista opisowa nie ma sensu. */
  variant = "plain",
}: {
  label: string;
  value: string;
  variant?: "plain" | "definition";
}) {
  if (variant === "definition") {
    return (
      <div className="space-y-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
