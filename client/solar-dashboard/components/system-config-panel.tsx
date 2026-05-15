"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoordinateInput } from "@/components/coordinate-input";

export type InstallationType = "rooftop" | "ground-mounted" | "carport";
export type PanelTechnology = "monocrystalline" | "polycrystalline" | "thin-film";
export type GridConnection = "grid-tied" | "hybrid" | "off-grid";
export type RegionType = "india" | "usa" | "europe" | "global";

export interface SystemConfig {
  installationType: InstallationType;
  panelTechnology: PanelTechnology;
  gridConnection: GridConnection;
  region: RegionType;
  systemCapacityKw: number;
  electricityTariffUsd: number;
  performanceRatio: number;
}

interface SystemConfigPanelProps {
  value: SystemConfig;
  onChange: (next: SystemConfig) => void;
  lat: number;
  lon: number;
  onLatChange: (next: number) => void;
  onLonChange: (next: number) => void;
  disabled?: boolean;
}

const REGION_TARIFF_DEFAULTS: Record<RegionType, number> = {
  india: 0.08,
  usa: 0.16,
  europe: 0.25,
  global: 0.12,
};

const REGION_LABELS: Record<RegionType, string> = {
  india: "India",
  usa: "USA",
  europe: "Europe",
  global: "Global",
};

function inferRegionFromCoordinates(lat: number, lon: number): RegionType {
  if (lat >= 5 && lat <= 38.5 && lon >= 68 && lon <= 97.5) return "india";
  if (lat >= 24 && lat <= 49.5 && lon >= -125 && lon <= -66) return "usa";
  if (lat >= 35 && lat <= 71 && lon >= -10 && lon <= 40) return "europe";
  return "global";
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatDecimalInput(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

export function SystemConfigPanel({
  value,
  onChange,
  lat,
  lon,
  onLatChange,
  onLonChange,
  disabled = false,
}: SystemConfigPanelProps) {
  const [tariffDraft, setTariffDraft] = useState(() => formatDecimalInput(value.electricityTariffUsd));
  const [performanceDraft, setPerformanceDraft] = useState(() => formatDecimalInput(value.performanceRatio));
  const [capacityDraft, setCapacityDraft] = useState(() => formatDecimalInput(value.systemCapacityKw));

  const capacityValue = clampNumber(
    capacityDraft.trim() === "" ? value.systemCapacityKw : Number(capacityDraft),
    1,
    100000,
  );
  const performanceValue = clampNumber(
    performanceDraft.trim() === "" ? value.performanceRatio : Number(performanceDraft),
    0.5,
    0.95,
  );

  const inferredRegion = inferRegionFromCoordinates(lat, lon);

  useEffect(() => {
    setTariffDraft(formatDecimalInput(value.electricityTariffUsd));
  }, [value.electricityTariffUsd]);

  useEffect(() => {
    setPerformanceDraft(formatDecimalInput(value.performanceRatio));
  }, [value.performanceRatio]);

  useEffect(() => {
    setCapacityDraft(formatDecimalInput(value.systemCapacityKw));
  }, [value.systemCapacityKw]);

  useEffect(() => {
    const shouldUpdateTariff =
      value.electricityTariffUsd === REGION_TARIFF_DEFAULTS[value.region];
    const nextTariff = shouldUpdateTariff
      ? REGION_TARIFF_DEFAULTS[inferredRegion]
      : value.electricityTariffUsd;

    if (value.region !== inferredRegion || nextTariff !== value.electricityTariffUsd) {
      onChange({
        ...value,
        region: inferredRegion,
        electricityTariffUsd: nextTariff,
      });
    }
  }, [inferredRegion, value, onChange]);

  const update = <K extends keyof SystemConfig>(key: K, nextValue: SystemConfig[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  const commitTariff = () => {
    const nextValue = clampNumber(Number(tariffDraft), 0.01, 1);
    setTariffDraft(formatDecimalInput(nextValue));
    update("electricityTariffUsd", nextValue);
  };

  const commitPerformanceRatio = () => {
    const nextValue = clampNumber(Number(performanceDraft), 0.5, 0.95);
    setPerformanceDraft(formatDecimalInput(nextValue));
    update("performanceRatio", nextValue);
  };

  const commitCapacity = () => {
    const nextValue = clampNumber(Number(capacityDraft), 1, 100000);
    setCapacityDraft(formatDecimalInput(nextValue));
    update("systemCapacityKw", nextValue);
  };

  const handleCommitKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, commit: () => void) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      commit();
    }
  };

  return (
    <Card className="glass-card border-amber-200/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">System configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <h4 className="text-sm font-medium mb-3">Installation type</h4>
            <RadioGroup
              value={value.installationType}
              onValueChange={(v) => update("installationType", v as InstallationType)}
              className="grid gap-2"
            >
              {(["rooftop", "ground-mounted", "carport"] as InstallationType[]).map((item) => (
                <label
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-white/60 bg-white/70 px-3 py-2"
                >
                  <RadioGroupItem value={item} className="mt-1" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize leading-tight">{item.replace("-", " ")}</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {item === "rooftop"
                        ? "Residential"
                        : item === "ground-mounted"
                          ? "Open field"
                          : "Parking + shade"}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <h4 className="text-sm font-medium mb-3">Panel technology</h4>
            <RadioGroup
              value={value.panelTechnology}
              onValueChange={(v) => update("panelTechnology", v as PanelTechnology)}
              className="grid gap-2"
            >
              {(["monocrystalline", "polycrystalline", "thin-film"] as PanelTechnology[]).map((item) => (
                <label
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-white/60 bg-white/70 px-3 py-2"
                >
                  <RadioGroupItem value={item} className="mt-1" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize leading-tight">{item.replace("-", " ")}</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {item === "monocrystalline"
                        ? "Highest efficiency"
                        : item === "polycrystalline"
                          ? "Balanced cost"
                          : "Low light"}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/70 p-3 lg:col-span-2">
            <h4 className="text-sm font-medium mb-3">Grid connection</h4>
            <RadioGroup
              value={value.gridConnection}
              onValueChange={(v) => update("gridConnection", v as GridConnection)}
              className="grid gap-2"
            >
              {(["grid-tied", "hybrid", "off-grid"] as GridConnection[]).map((item) => (
                <label
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-white/60 bg-white/70 px-3 py-2"
                >
                  <RadioGroupItem value={item} className="mt-1" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize leading-tight">{item.replace("-", " ")}</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {item === "grid-tied" ? "Net metering" : item === "hybrid" ? "Battery ready" : "Standalone"}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
            <div className="mt-4 space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select value={value.region} disabled>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {(["india", "usa", "europe", "global"] as RegionType[]).map((region) => (
                    <SelectItem key={region} value={region}>
                      {REGION_LABELS[region]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-set from coordinates. Tariff updates if not customized.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border border-white/60 bg-white/70 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="systemCapacityKw">System capacity</Label>
                <span className="text-xs text-muted-foreground">kW</span>
              </div>
              <Input
                id="systemCapacityKw"
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={capacityDraft}
                onChange={(e) => setCapacityDraft(e.target.value)}
                onBlur={commitCapacity}
                onKeyDown={(event) => handleCommitKeyDown(event, commitCapacity)}
              />
              <Slider
                value={[capacityValue]}
                min={1}
                max={100000}
                step={0.5}
                onValueChange={(next) => {
                  const nextValue = clampNumber(next[0] ?? capacityValue, 1, 100000);
                  setCapacityDraft(formatDecimalInput(nextValue));
                  update("systemCapacityKw", nextValue);
                }}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">Range: 1 to 100,000 kW</p>
            </div>

            <div className="rounded-xl border border-white/60 bg-white/70 p-3 space-y-3">
              <Label htmlFor="electricityTariffUsd">Electricity tariff (USD/kWh)</Label>
              <Input
                id="electricityTariffUsd"
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={tariffDraft}
                onChange={(e) => setTariffDraft(e.target.value)}
                onBlur={commitTariff}
                onKeyDown={(event) => handleCommitKeyDown(event, commitTariff)}
              />
            </div>

            <div className="rounded-xl border border-white/60 bg-white/70 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="performanceRatio">Performance ratio</Label>
                <span className="text-xs text-muted-foreground">{performanceValue.toFixed(2)}</span>
              </div>
              <Input
                id="performanceRatio"
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={performanceDraft}
                onChange={(e) => setPerformanceDraft(e.target.value)}
                onBlur={commitPerformanceRatio}
                onKeyDown={(event) => handleCommitKeyDown(event, commitPerformanceRatio)}
              />
              <Slider
                value={[performanceValue]}
                min={0.5}
                max={0.95}
                step={0.01}
                onValueChange={(next) => {
                  const nextValue = clampNumber(next[0] ?? performanceValue, 0.5, 0.95);
                  setPerformanceDraft(formatDecimalInput(nextValue));
                  update("performanceRatio", nextValue);
                }}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">Includes inverter, wiring, temperature, and soiling losses.</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-3 space-y-3">
            <h3 className="text-sm font-semibold">Manual coordinates</h3>
            <CoordinateInput
              lat={lat}
              lon={lon}
              onLatChange={onLatChange}
              onLonChange={onLonChange}
            />
            <p className="text-xs text-muted-foreground">
              Coordinates stay synced with map selection and city search.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
