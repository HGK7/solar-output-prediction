"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Download,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SavedLocationRecord } from "@/types";

interface LocationHeaderBarProps {
  location: SavedLocationRecord;
  onReanalyse: () => void;
  onEditOpen: () => void;
  onExportCsv: () => void;
}

const REGION_DISPLAY: Record<string, string> = {
  india: "India",
  usa: "USA",
  europe: "Europe",
  global: "Global",
};

const SCALE_DISPLAY: Record<string, string> = {
  homeowner: "Homeowner",
  small_business: "Small Business",
  industrial: "Industrial",
};

export function LocationHeaderBar({
  location,
  onReanalyse,
  onEditOpen,
  onExportCsv,
}: LocationHeaderBarProps) {
  const coords = `${location.coordinates.lat.toFixed(4)}, ${location.coordinates.lon.toFixed(4)}`;
  const regionLabel =
    REGION_DISPLAY[location.systemConfig.region] ?? location.systemConfig.region;
  const scaleLabel = location.systemConfig.planningProfile?.scale
    ? SCALE_DISPLAY[location.systemConfig.planningProfile.scale]
    : null;

  return (
    <header className="flex flex-col gap-4 rounded-xl border border-tile-border bg-tile p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/locations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Saved Locations
        </Link>

        <span className="text-xs text-muted-foreground tabular-nums">
          Updated {new Date(location.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {location.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-tile-border bg-tile-inset px-2.5 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
              <MapPin className="size-3 text-primary" aria-hidden />
              {coords}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {scaleLabel ? (
              <Badge variant="secondary" className="text-xs font-medium">
                {scaleLabel}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="text-xs font-medium">
              {regionLabel}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {location.systemConfig.installationType.replaceAll("-", " ")}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {location.systemConfig.gridConnection.replaceAll("-", " ")}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {location.systemConfig.panelTechnology.replaceAll("-", " ")}
            </Badge>
            {location.metadata.ownerName ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <User className="size-3 text-muted-foreground" aria-hidden />
                {location.metadata.ownerName}
              </Badge>
            ) : null}
            {location.metadata.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {location.metadata.notes ? (
            <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
              {location.metadata.notes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={onReanalyse}>
            <RefreshCw className="size-3.5" aria-hidden />
            Re-analyse Site
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onEditOpen}>
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Edit Site &amp; Defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={location.runs.length === 0}
          >
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>
    </header>
  );
}
