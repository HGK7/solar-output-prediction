import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something failed.",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[120px] flex-col items-start justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-destructive",
        className,
      )}
    >
      <div className="inline-flex items-center gap-2 text-sm font-semibold">
        <AlertCircle className="size-4" aria-hidden />
        <span>{title}</span>
      </div>
      <p className="text-sm text-destructive/90">{message}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
