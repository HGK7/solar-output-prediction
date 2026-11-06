"use client";

import { Lock, MapPin, RotateCcw, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BentoGrid, BentoTile } from "@/components/bento";
import { SystemConfigPanel, type SystemConfig } from "@/components/system-config-panel";

interface SetupViewProps {
  lat: number;
  lon: number;
  isLoading: boolean;
  systemConfig: SystemConfig;
  baselineConfig?: SystemConfig | null;
  annualAverages: Record<string, number> | null;
  stage: string;
  showEmptyState: boolean;
  apiOffline: boolean;
  locationLocked: boolean;
  locationLockedLabel: string | null;
  onLatChange: (next: number) => void;
  onLonChange: (next: number) => void;
  onSystemConfigChange: (next: SystemConfig) => void;
  onAnalyze: () => void;
  onExitReanalysis?: () => void;
  LocationMapComponent: React.ComponentType<{
    lat: number;
    lon: number;
    onLocationChange: (lat: number, lon: number) => void;
    disabled?: boolean;
  }>;
}

function computeConfigChangeBadges(
  baseline: SystemConfig | null | undefined,
  current: SystemConfig,
): string[] {
  if (!baseline) return [];
  const diffs: string[] = [];

  if (Math.abs(baseline.systemCapacityKw - current.systemCapacityKw) >= 0.05) {
    diffs.push(
      `Capacity: ${baseline.systemCapacityKw} -> ${current.systemCapacityKw} kW`,
    );
  }
  if (baseline.panelTechnology !== current.panelTechnology) {
    diffs.push(`Panel: ${baseline.panelTechnology} -> ${current.panelTechnology}`);
  }
  if (baseline.installationType !== current.installationType) {
    diffs.push(
      `Mount: ${baseline.installationType} -> ${current.installationType}`,
    );
  }
  if (baseline.gridConnection !== current.gridConnection) {
    diffs.push(`Grid: ${baseline.gridConnection} -> ${current.gridConnection}`);
  }
  if (Math.abs(baseline.electricityTariffUsd - current.electricityTariffUsd) >= 0.001) {
    diffs.push(
      `Tariff: $${baseline.electricityTariffUsd} -> $${current.electricityTariffUsd}/kWh`,
    );
  }
  if (Math.abs(baseline.performanceRatio - current.performanceRatio) >= 0.005) {
    diffs.push(
      `PR: ${baseline.performanceRatio.toFixed(2)} -> ${current.performanceRatio.toFixed(2)}`,
    );
  }
  if ((baseline.model ?? "hist_gradient_boosting") !== (current.model ?? "hist_gradient_boosting")) {
    diffs.push(
      `Model: ${(baseline.model ?? "hist_gradient_boosting").replace(/_/g, " ")} -> ${(current.model ?? "hist_gradient_boosting").replace(/_/g, " ")}`,
    );
  }
  if ((baseline.batteryCapacityKwh ?? 0) !== (current.batteryCapacityKwh ?? 0)) {
    diffs.push(
      `Battery: ${baseline.batteryCapacityKwh ?? "auto"} -> ${current.batteryCapacityKwh ?? "auto"} kWh`,
    );
  }
  if ((baseline.includeIncentives ?? true) !== (current.includeIncentives ?? true)) {
    diffs.push(
      `Subsidies: ${(baseline.includeIncentives ?? true) ? "on" : "off"} -> ${(current.includeIncentives ?? true) ? "on" : "off"}`,
    );
  }

  return diffs;
}

export function SetupView({
  lat,
  lon,
  isLoading,
  systemConfig,
  baselineConfig = null,
  apiOffline,
  locationLocked,
  locationLockedLabel,
  onLatChange,
  onLonChange,
  onSystemConfigChange,
  onAnalyze,
  onExitReanalysis,
  LocationMapComponent,
}: SetupViewProps) {
  const changedParamBadges = locationLocked
    ? computeConfigChangeBadges(baselineConfig, systemConfig)
    : [];

  return (
    <div className="relative flex flex-col gap-5 pb-24">
      {locationLocked ? (
        <Alert className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTitle className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Lock className="size-3.5 text-primary" aria-hidden />
                Re-analysing {locationLockedLabel ?? "saved site"}
              </AlertTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {lat.toFixed(4)}, {lon.toFixed(4)}
              </Badge>
            </div>
            {changedParamBadges.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Modified vs. latest run:</span>
                {changedParamBadges.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="font-mono text-xs font-normal"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            ) : (
              <AlertDescription className="text-xs">
                Coordinates are fixed to this site. Adjust capacity, storage, or panel type below to compare against the latest run.
              </AlertDescription>
            )}
          </div>
          {onExitReanalysis ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExitReanalysis}
              className="shrink-0"
            >
              <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
              New site
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {apiOffline ? (
        <Alert variant="destructive">
          <WifiOff className="size-4" aria-hidden />
          <AlertTitle>Backend API offline</AlertTitle>
          <AlertDescription>
            Configure your site parameters below. Analysis will enable automatically when the API reconnects.
          </AlertDescription>
        </Alert>
      ) : null}

      <BentoGrid className="auto-rows-min items-start">
        <BentoTile
          title="Select location"
          description={
            locationLocked
              ? "Coordinates are fixed to compare runs at this site."
              : "Search for a city, then click the map or drag the pin."
          }
          icon={<MapPin className="size-4" />}
          colSpan={2}
          action={
            <Badge variant="outline" className="font-mono text-xs font-normal">
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </Badge>
          }
          className="min-h-[360px]"
        >
          <LocationMapComponent
            lat={lat}
            lon={lon}
            onLocationChange={(nextLat, nextLon) => {
              onLatChange(nextLat);
              onLonChange(nextLon);
            }}
            disabled={isLoading || locationLocked}
          />
        </BentoTile>

        <BentoTile
          title="System setup"
          description="Size your system from your monthly bill or configure custom hardware."
          colSpan={2}
        >
          <SystemConfigPanel
            value={systemConfig}
            onChange={onSystemConfigChange}
            lat={lat}
            lon={lon}
            onLatChange={onLatChange}
            onLonChange={onLonChange}
            disabled={isLoading}
            coordinatesLocked={locationLocked}
          />
        </BentoTile>
      </BentoGrid>

      <div className="sticky bottom-0 z-10 -mx-6 border-t border-tile-border bg-background/95 px-6 py-4 backdrop-blur-sm md:-mx-10 lg:-mx-12">
        <div className="mx-auto flex max-w-3xl justify-center">
          <Button
            className="w-full max-w-md"
            size="lg"
            onClick={onAnalyze}
            disabled={isLoading || apiOffline}
          >
            {apiOffline
              ? "API offline"
              : isLoading
                ? "Analyzing..."
                : locationLocked
                  ? `Run re-analysis for ${locationLockedLabel ?? "site"}`
                  : "Run analysis"}
          </Button>
        </div>
      </div>
    </div>
  );
}
