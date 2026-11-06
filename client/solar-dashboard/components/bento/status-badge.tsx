import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusBadgeState =
  | "ok"
  | "warn"
  | "error"
  | "degraded"
  | "loading";

const stateConfig: Record<
  StatusBadgeState,
  { label: string; dotClass: string; badgeClass: string }
> = {
  ok: {
    label: "OK",
    dotClass: "bg-status-ok",
    badgeClass:
      "border-status-ok/30 bg-status-ok/10 text-status-ok",
  },
  warn: {
    label: "Warning",
    dotClass: "bg-status-warn",
    badgeClass:
      "border-status-warn/30 bg-status-warn/10 text-status-warn",
  },
  error: {
    label: "Error",
    dotClass: "bg-status-error",
    badgeClass:
      "border-status-error/30 bg-status-error/10 text-status-error",
  },
  degraded: {
    label: "Degraded",
    dotClass: "bg-status-degraded",
    badgeClass:
      "border-status-degraded/30 bg-status-degraded/10 text-status-degraded",
  },
  loading: {
    label: "Loading",
    dotClass: "bg-muted-foreground",
    badgeClass: "border-border bg-muted text-muted-foreground",
  },
};

export interface StatusBadgeProps extends React.ComponentProps<"span"> {
  status: StatusBadgeState;
  label?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = stateConfig[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.badgeClass,
        className,
      )}
      {...props}
    >
      {status === "loading" ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : showDot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", config.dotClass)}
          aria-hidden
        />
      ) : null}
      {displayLabel}
    </span>
  );
}
