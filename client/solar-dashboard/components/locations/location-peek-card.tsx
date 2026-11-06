"use client";

import Link from "next/link";
import { MapPin, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/bento";
import type { SavedLocationRecord } from "@/types";
import { cn } from "@/lib/utils";

interface LocationPeekCardProps {
  location: SavedLocationRecord;
  onReanalyse: () => void;
  onDelete: () => void;
  className?: string;
}

const REGION_DISPLAY: Record<string, string> = {
  india: "India",
  usa: "USA",
  europe: "Europe",
  global: "Global",
};

const PANEL_DISPLAY: Record<string, string> = {
  monocrystalline: "Monocrystalline",
  polycrystalline: "Polycrystalline",
  "thin-film": "Thin-film",
};

export function LocationPeekCard({
  location,
  onReanalyse,
  onDelete,
  className,
}: LocationPeekCardProps) {
  const latest = location.latestRun;
  const coords = `${location.coordinates.lat.toFixed(4)}, ${location.coordinates.lon.toFixed(4)}`;
  const panelLabel =
    PANEL_DISPLAY[location.systemConfig.panelTechnology] ??
    location.systemConfig.panelTechnology.replaceAll("-", " ");
  const regionLabel =
    REGION_DISPLAY[location.systemConfig.region] ?? location.systemConfig.region;

  return (
    <article
      className={cn(
        "location-peek-card flex flex-col gap-6 rounded-2xl border border-tile-border bg-tile p-6 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate font-mono text-xs tabular-nums">{coords}</span>
          </div>
          <h2 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {location.name}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {location.systemConfig.systemCapacityKw.toFixed(1)} kW · {panelLabel} · {regionLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Re-analyse ${location.name}`}
            onClick={onReanalyse}
            className="size-9 min-h-9 min-w-9"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete ${location.name}`}
            onClick={onDelete}
            className="size-9 min-h-9 min-w-9 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {latest ? (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Annual savings
            </p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground md:text-4xl">
              ${latest.summary.annualSavingsUsd.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2 border-t border-tile-border pt-4">
            <div className="grid grid-cols-3 gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Output</span>
              <span>Payback</span>
              <span>Confidence</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-base font-semibold tabular-nums tracking-tight text-foreground md:text-lg">
              <span>{latest.summary.annualOutputKwh.toLocaleString()} kWh</span>
              <span>{latest.summary.paybackYears} yr</span>
              <span className="capitalize">{latest.summary.confidence}</span>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No saved analysis run."
          description="Re-analyse to generate results for this site."
          className="min-h-0 border-0 bg-transparent px-0 py-0"
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-tile-border pt-4">
        <Button type="button" size="sm" onClick={onReanalyse}>
          <RefreshCw className="size-4" />
          Re-analyse
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/location/${location.id}`}>View details</Link>
        </Button>
      </div>
    </article>
  );
}
