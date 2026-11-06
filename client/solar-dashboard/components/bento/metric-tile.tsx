import * as React from "react";

import { cn } from "@/lib/utils";

export interface MetricTileProps extends React.ComponentProps<"div"> {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    trend?: "up" | "down" | "neutral";
  };
}

const trendClass = {
  up: "text-status-ok",
  down: "text-status-error",
  neutral: "text-muted-foreground",
} as const;

export function MetricTile({
  label,
  value,
  delta,
  className,
  ...props
}: MetricTileProps) {
  return (
    <div
      data-slot="metric-tile"
      className={cn("bento-tile-inset flex flex-col gap-1 p-4", className)}
      {...props}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight md:text-3xl">
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "text-xs font-medium tabular-nums",
            trendClass[delta.trend ?? "neutral"],
          )}
        >
          {delta.value}
        </p>
      ) : null}
    </div>
  );
}
