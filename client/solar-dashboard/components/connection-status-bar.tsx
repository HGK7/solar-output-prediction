"use client";

import { RefreshCw, Wifi, WifiOff, Loader2, Moon } from "lucide-react";
import {
  useBackendStatusContext,
} from "@/lib/backend-status-context";
import type { BackendStatus } from "@/lib/use-backend-status";

const STATUS_CONFIG: Record<
  BackendStatus,
  { label: string; dotClass: string; icon: React.ElementType; barClass: string }
> = {
  checking: {
    label: "Checking backend…",
    dotClass: "bg-amber-400 animate-pulse",
    icon: Loader2,
    barClass: "bg-amber-50/80 border-amber-200/60 text-amber-700",
  },
  connected: {
    label: "Backend connected",
    dotClass: "bg-emerald-400",
    icon: Wifi,
    barClass: "bg-emerald-50/80 border-emerald-200/60 text-emerald-700",
  },
  sleeping: {
    label: "Backend is waking up — free tier may take ~30 s",
    dotClass: "bg-amber-400 animate-pulse",
    icon: Moon,
    barClass: "bg-amber-50/80 border-amber-200/60 text-amber-700",
  },
  unreachable: {
    label: "Backend unreachable",
    dotClass: "bg-red-400",
    icon: WifiOff,
    barClass: "bg-red-50/80 border-red-200/60 text-red-500",
  },
};

function timeAgo(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function ConnectionStatusBar() {
  const { status, lastChecked, retry } = useBackendStatusContext();
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium border-b backdrop-blur-sm ${cfg.barClass}`}
    >
      {/* Status dot */}
      <span className={`inline-block h-2 w-2 rounded-full ${cfg.dotClass}`} />

      {/* Icon */}
      <Icon
        className={`h-3.5 w-3.5 ${status === "checking" ? "animate-spin" : ""}`}
      />

      {/* Label */}
      <span>{cfg.label}</span>

      {/* Last checked */}
      {lastChecked && status !== "checking" && (
        <span className="opacity-60">· checked {timeAgo(lastChecked)}</span>
      )}

      <button
        onClick={() => {
          void retry();
        }}
        className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium hover:bg-white/60 transition-colors cursor-pointer"
        aria-label="Refresh backend connection status"
      >
        <RefreshCw className="h-3 w-3" />
        Refresh
      </button>
    </div>
  );
}
