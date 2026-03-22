"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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
  disabled?: boolean;
}

const REGION_TARIFF_DEFAULTS: Record<RegionType, number> = {
  india: 0.08,
  usa: 0.16,
  europe: 0.25,
  global: 0.12,
};

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function SystemConfigPanel({ value, onChange, disabled = false }: SystemConfigPanelProps) {
  const update = <K extends keyof SystemConfig>(key: K, nextValue: SystemConfig[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">System Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="rounded-lg border border-border/60 bg-background/60 px-3 py-2" open>
          <summary className="cursor-pointer text-sm font-medium">Installation & Hardware</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="installationType">Installation Type</Label>
              <select
                id="installationType"
                disabled={disabled}
                value={value.installationType}
                onChange={(e) => update("installationType", e.target.value as InstallationType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="rooftop">Rooftop</option>
                <option value="ground-mounted">Ground-Mounted</option>
                <option value="carport">Carport</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="panelTechnology">Panel Technology</Label>
              <select
                id="panelTechnology"
                disabled={disabled}
                value={value.panelTechnology}
                onChange={(e) => update("panelTechnology", e.target.value as PanelTechnology)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="monocrystalline">Monocrystalline (20%)</option>
                <option value="polycrystalline">Polycrystalline (17%)</option>
                <option value="thin-film">Thin-film (11%)</option>
              </select>
            </div>
          </div>
        </details>

        <details className="rounded-lg border border-border/60 bg-background/60 px-3 py-2" open>
          <summary className="cursor-pointer text-sm font-medium">Grid & Financial Context</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gridConnection">Grid Connection</Label>
              <select
                id="gridConnection"
                disabled={disabled}
                value={value.gridConnection}
                onChange={(e) => update("gridConnection", e.target.value as GridConnection)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="grid-tied">Grid-tied</option>
                <option value="hybrid">Hybrid</option>
                <option value="off-grid">Off-grid</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="region">Region</Label>
              <select
                id="region"
                disabled={disabled}
                value={value.region}
                onChange={(e) => {
                  const region = e.target.value as RegionType;
                  onChange({
                    ...value,
                    region,
                    electricityTariffUsd: REGION_TARIFF_DEFAULTS[region],
                  });
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="india">India</option>
                <option value="usa">USA</option>
                <option value="europe">Europe</option>
                <option value="global">Global</option>
              </select>
            </div>
          </div>
        </details>

        <Separator />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="systemCapacityKw">System Capacity (kW)</Label>
            <Input
              id="systemCapacityKw"
              type="number"
              step={0.1}
              min={1}
              max={100}
              disabled={disabled}
              value={value.systemCapacityKw}
              onChange={(e) => {
                const nextValue = clampNumber(parseFloat(e.target.value), 1, 100);
                update("systemCapacityKw", nextValue);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="electricityTariffUsd">Electricity Tariff (USD/kWh)</Label>
            <Input
              id="electricityTariffUsd"
              type="number"
              step={0.001}
              min={0.01}
              max={1}
              disabled={disabled}
              value={value.electricityTariffUsd}
              onChange={(e) => {
                const nextValue = clampNumber(parseFloat(e.target.value), 0.01, 1);
                update("electricityTariffUsd", nextValue);
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="performanceRatio">Performance Ratio</Label>
          <Input
            id="performanceRatio"
            type="number"
            step={0.01}
            min={0.5}
            max={0.95}
            disabled={disabled}
            value={value.performanceRatio}
            onChange={(e) => {
              const nextValue = clampNumber(parseFloat(e.target.value), 0.5, 0.95);
              update("performanceRatio", nextValue);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Includes inverter, wiring, temperature, and soiling losses.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
