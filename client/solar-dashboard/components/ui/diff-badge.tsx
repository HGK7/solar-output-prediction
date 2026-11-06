"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DiffBadgeProps {
  baseVal: number;
  compVal: number;
  unit?: string;
  prefix?: string;
  lowerIsBetter?: boolean;
  showPct?: boolean;
  comparedLabel?: string;
  className?: string;
}

export function DiffBadge({
  baseVal,
  compVal,
  unit = "",
  prefix = "",
  lowerIsBetter = false,
  showPct = false,
  comparedLabel = "Run #1",
  className,
}: DiffBadgeProps) {
  const delta = baseVal - compVal;
  if (Math.abs(delta) < 0.0001) {
    return (
      <span
        className={cn(
          "ml-2 inline-block rounded-xs bg-tile-inset px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground",
          className,
        )}
      >
        [No change vs {comparedLabel}]
      </span>
    );
  }

  const isPositive = delta > 0;
  const isFavorable = lowerIsBetter ? !isPositive : isPositive;
  const sign = isPositive ? "+" : "-";
  const absVal = Math.abs(delta);
  const numStr =
    absVal % 1 === 0
      ? absVal.toLocaleString()
      : absVal.toFixed(absVal < 1 ? 3 : 1);
  const pctStr =
    showPct && compVal !== 0
      ? ` / ${isPositive ? "+" : ""}${(((baseVal - compVal) / compVal) * 100).toFixed(1)}%`
      : "";

  return (
    <span
      className={cn(
        "ml-2 inline-block rounded-xs px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
        isFavorable
          ? "border border-[#16A34A]/30 bg-[#16A34A]/15 text-[#15803D]"
          : "border border-[#DC2626]/30 bg-[#DC2626]/15 text-[#B91C1C]",
        className,
      )}
    >
      [{sign}
      {prefix}
      {numStr}
      {unit}
      {pctStr} vs {comparedLabel}]
    </span>
  );
}
