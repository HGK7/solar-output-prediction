import { cn } from "@/lib/utils";
import { formatDelta, type RunSummaryDelta } from "@/lib/run-summary-delta";

function DeltaCell({
  label,
  value,
  unit,
  invertTone = false,
}: {
  label: string;
  value: number;
  unit?: string;
  invertTone?: boolean;
}) {
  const positive = value > 0;
  const negative = value < 0;
  const good = invertTone ? negative : positive;
  const bad = invertTone ? positive : negative;

  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          good && "text-status-ok",
          bad && "text-status-error",
          !good && !bad && "text-muted-foreground",
        )}
      >
        {value === 0 ? "No change" : formatDelta(value, unit)}
      </p>
    </div>
  );
}

export function RunDeltaStrip({ delta }: { delta: RunSummaryDelta }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-t border-tile-border pt-4">
      <DeltaCell label="Output change" value={delta.annualOutputKwh} unit="kWh/yr" />
      <DeltaCell label="Savings change" value={delta.annualSavingsUsd} unit="USD/yr" />
      <DeltaCell label="Payback change" value={delta.paybackYears} unit="yr" invertTone />
    </div>
  );
}
