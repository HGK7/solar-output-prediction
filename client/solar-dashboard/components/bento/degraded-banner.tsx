import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DegradedBannerProps {
  message: string;
  className?: string;
}

export function DegradedBanner({ message, className }: DegradedBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-status-degraded/30 bg-status-degraded/10 px-3 py-2 text-sm text-status-degraded",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
