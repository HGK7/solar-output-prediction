import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] flex-col items-start justify-center gap-2 rounded-xl border border-tile-border bg-tile-inset px-4 py-4",
        className,
      )}
    >
      <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-muted-foreground" aria-hidden>
          {icon ?? <Inbox className="size-4" />}
        </span>
        <span>{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
