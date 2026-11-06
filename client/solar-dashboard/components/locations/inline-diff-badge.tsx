"use client";

import type { MetricDiff } from "@/lib/run-summary-delta";
import { cn } from "@/lib/utils";

interface InlineDiffBadgeProps {
  diff?: MetricDiff | null;
  invertTone?: boolean;
  showPct?: boolean;
  compact?: boolean;
  compareLabel?: string;
  className?: string;
}

function formatMetricNumber(
  value: number,
  options: { formatAsCurrency?: boolean; decimals?: number; unit?: string; signed?: boolean },
): string {
  const { formatAsCurrency = false, decimals = 2, unit = "", signed = false } = options;
  const absVal = Math.abs(value);
  const sign = signed ? (value > 0 ? "+" : value < 0 ? "-" : "") : value < 0 ? "-" : "";

  const formattedNum = absVal.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  if (formatAsCurrency) {
    return `${sign}$${formattedNum}${unit}`;
  }

  const unitSuffix = unit ? (unit.startsWith("/") || unit === "%" ? unit : ` ${unit}`) : "";
  return `${sign}${formattedNum}${unitSuffix}`;
}

export function InlineDiffBadge({
  diff,
  invertTone,
  showPct = true,
  compact = false,
  compareLabel = "Compared run",
  className,
}: InlineDiffBadgeProps) {
  if (!diff) return null;

  const isInverted = invertTone ?? diff.invertTone ?? false;
  const isZero = Math.abs(diff.delta) < 1e-6;

  const isFavorable = !isZero && (isInverted ? diff.delta < 0 : diff.delta > 0);
  const isUnfavorable = !isZero && (isInverted ? diff.delta > 0 : diff.delta < 0);

  const deltaText = isZero
    ? "No change"
    : formatMetricNumber(diff.delta, {
        formatAsCurrency: diff.formatAsCurrency,
        decimals: diff.decimals,
        unit: diff.unit,
        signed: true,
      });

  const pctText =
    !isZero && showPct && diff.pct !== null && Math.abs(diff.pct) >= 0.1
      ? ` (${diff.pct > 0 ? "+" : ""}${diff.pct.toFixed(1)}%)`
      : "";

  const compareFormatted = formatMetricNumber(diff.compareVal, {
    formatAsCurrency: diff.formatAsCurrency,
    decimals: diff.decimals,
    unit: diff.unit,
    signed: false,
  });

  return (
    <span
      title={`${compareLabel}: ${compareFormatted}`}
      aria-label={`Difference against ${compareLabel}: ${deltaText}${pctText}. ${compareLabel} value is ${compareFormatted}`}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium leading-tight tabular-nums transition-colors",
        compact && "px-1.5 py-0 text-[10px]",
        isFavorable && "border-status-ok/25 bg-status-ok/10 text-status-ok",
        isUnfavorable && "border-status-error/25 bg-status-error/10 text-status-error",
        isZero && "border-tile-border bg-tile-inset text-muted-foreground",
        className,
      )}
    >
      {deltaText}
      {!compact ? pctText : null}
    </span>
  );
}
