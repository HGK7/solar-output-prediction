"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BatteryCharging, Calculator, Cpu, Sparkles, Unlock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CoordinateInput } from "@/components/coordinate-input";
import { useGuestPreferencesContext } from "@/lib/guest-preferences-context";
import type { PlanningGoal, PlanningProfile, PlanningScale } from "@/types";

export type InstallationType = "rooftop" | "ground-mounted" | "carport";
export type PanelTechnology = "monocrystalline" | "polycrystalline" | "thin-film";
export type GridConnection = "grid-tied" | "hybrid" | "off-grid";
export type RegionType = "india" | "usa" | "europe" | "global";
export type MlModelType =
  | "hist_gradient_boosting"
  | "random_forest"
  | "linear_regression"
  | "svm";

export interface SystemConfig {
  installationType: InstallationType;
  panelTechnology: PanelTechnology;
  gridConnection: GridConnection;
  region: RegionType;
  systemCapacityKw: number;
  electricityTariffUsd: number;
  performanceRatio: number;
  model?: MlModelType;
  batteryCapacityKwh?: number;
  includeIncentives?: boolean;
  monthlyBillUsd?: number;
  monthlyConsumptionKwh?: number;
  availableRoofAreaM2?: number;
  planningProfile?: PlanningProfile;
}

interface SystemConfigPanelProps {
  value: SystemConfig;
  onChange: (next: SystemConfig) => void;
  lat: number;
  lon: number;
  onLatChange: (next: number) => void;
  onLonChange: (next: number) => void;
  disabled?: boolean;
  coordinatesLocked?: boolean;
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

const REGION_SUBSIDY_HINT: Record<RegionType, string> = {
  india: "Applies PM Surya Ghar residential subsidy or 40% commercial depreciation",
  usa: "Applies 30% Federal Clean Energy Credit",
  europe: "Applies 15% solar VAT exemption and regional grant benchmark",
  global: "Applies regional incentives when available",
};

const SCALE_PRESETS: Record<
  PlanningScale,
  {
    label: string;
    rangeLabel: string;
    minKw: number;
    maxKw: number;
    stepKw: number;
    defaultKw: number;
  }
> = {
  homeowner: {
    label: "Home",
    rangeLabel: "1–15 kW",
    minKw: 1,
    maxKw: 25,
    stepKw: 0.5,
    defaultKw: 5,
  },
  small_business: {
    label: "Small Business",
    rangeLabel: "15–100 kW",
    minKw: 10,
    maxKw: 150,
    stepKw: 1,
    defaultKw: 35,
  },
  industrial: {
    label: "Industrial",
    rangeLabel: "100 kW–5 MW",
    minKw: 100,
    maxKw: 5000,
    stepKw: 25,
    defaultKw: 250,
  },
};

const GOAL_OPTIONS: Array<{
  id: PlanningGoal;
  label: string;
}> = [
  {
    id: "lowest_payback",
    label: "Fastest Payback",
  },
  {
    id: "max_offset",
    label: "100% Bill Offset",
  },
  {
    id: "backup_resilience",
    label: "Battery Backup",
  },
];

const MODEL_OPTIONS: Array<{
  value: MlModelType;
  label: string;
  detail: string;
}> = [
  {
    value: "hist_gradient_boosting",
    label: "Gradient Boosting (Default)",
    detail: "Best accuracy across varied climate zones",
  },
  {
    value: "random_forest",
    label: "Random Forest",
    detail: "Decision-tree ensemble estimator",
  },
  {
    value: "linear_regression",
    label: "Linear Regression",
    detail: "Standard linear baseline",
  },
  {
    value: "svm",
    label: "Support Vector Regression",
    detail: "Margin-based climate estimator",
  },
];

const PANEL_WATT_PEAK = 400;
const ROOF_AREA_M2_PER_KW = 6.5;

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

function formatDecimalInput(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function SystemConfigPanel({
  value,
  onChange,
  lat,
  lon,
  onLatChange,
  onLonChange,
  disabled = false,
  coordinatesLocked = false,
}: SystemConfigPanelProps) {
  const {
    areaUnit,
    convertAreaFromM2,
    convertAreaToM2,
    formatArea,
  } = useGuestPreferencesContext();

  const [setupMode, setSetupMode] = useState<"guided" | "custom">("guided");
  const [tariffDraft, setTariffDraft] = useState(() =>
    formatDecimalInput(value.electricityTariffUsd),
  );
  const [performanceDraft, setPerformanceDraft] = useState(() =>
    formatDecimalInput(value.performanceRatio),
  );
  const [capacityDraft, setCapacityDraft] = useState(() =>
    formatDecimalInput(value.systemCapacityKw),
  );
  const [batteryDraft, setBatteryDraft] = useState(() =>
    formatDecimalInput(value.batteryCapacityKwh),
  );
  const [sizingMode, setSizingMode] = useState<"bill" | "kwh">(
    value.monthlyConsumptionKwh && !value.monthlyBillUsd ? "kwh" : "bill",
  );
  const [billDraft, setBillDraft] = useState(() =>
    formatDecimalInput(value.monthlyBillUsd),
  );
  const [usageKwhDraft, setUsageKwhDraft] = useState(() =>
    formatDecimalInput(value.monthlyConsumptionKwh),
  );
  const [roofAreaDraft, setRoofAreaDraft] = useState(() =>
    typeof value.availableRoofAreaM2 === "number" && Number.isFinite(value.availableRoofAreaM2)
      ? String(Math.round(convertAreaFromM2(value.availableRoofAreaM2) * 10) / 10)
      : "",
  );
  const [regionManuallyOverridden, setRegionManuallyOverridden] = useState(false);

  const activeScale: PlanningScale =
    value.planningProfile?.scale ??
    (value.systemCapacityKw >= 100
      ? "industrial"
      : value.systemCapacityKw > 15
        ? "small_business"
        : "homeowner");
  const activeGoal: PlanningGoal =
    value.planningProfile?.goal ??
    (value.gridConnection === "hybrid" || value.gridConnection === "off-grid"
      ? "backup_resilience"
      : "lowest_payback");

  const scalePreset = SCALE_PRESETS[activeScale];

  const capacityValue = clampNumber(
    capacityDraft.trim() === "" ? value.systemCapacityKw : Number(capacityDraft),
    0.5,
    5000,
  );
  const sliderCapacityValue = clampNumber(
    capacityValue,
    scalePreset.minKw,
    scalePreset.maxKw,
  );
  const performanceValue = clampNumber(
    performanceDraft.trim() === "" ? value.performanceRatio : Number(performanceDraft),
    0.5,
    0.95,
  );

  const inferredRegion = inferRegionFromCoordinates(lat, lon);
  const prevInferredRegionRef = useRef<RegionType>(inferredRegion);

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
    setBatteryDraft(formatDecimalInput(value.batteryCapacityKwh));
  }, [value.batteryCapacityKwh]);

  useEffect(() => {
    if (prevInferredRegionRef.current === inferredRegion) return;
    prevInferredRegionRef.current = inferredRegion;

    if (regionManuallyOverridden || coordinatesLocked) return;

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
        planningProfile: {
          scale: activeScale,
          jurisdiction: inferredRegion,
          goal: activeGoal,
        },
      });
    }
  }, [
    inferredRegion,
    regionManuallyOverridden,
    coordinatesLocked,
    value,
    onChange,
    activeScale,
    activeGoal,
  ]);

  const update = <K extends keyof SystemConfig>(key: K, nextValue: SystemConfig[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  const handleScaleChange = (nextScale: PlanningScale) => {
    if (!nextScale) return;
    const preset = SCALE_PRESETS[nextScale];
    const isOutOfBounds =
      value.systemCapacityKw < preset.minKw || value.systemCapacityKw > preset.maxKw;
    const nextCapacity = isOutOfBounds ? preset.defaultKw : value.systemCapacityKw;
    const nextInstallation: InstallationType =
      nextScale === "industrial" && value.installationType === "rooftop"
        ? "ground-mounted"
        : value.installationType;

    setCapacityDraft(formatDecimalInput(nextCapacity));
    onChange({
      ...value,
      systemCapacityKw: nextCapacity,
      installationType: nextInstallation,
      planningProfile: {
        scale: nextScale,
        jurisdiction: value.region,
        goal: activeGoal,
      },
    });
  };

  const handleGoalChange = (nextGoal: PlanningGoal) => {
    if (!nextGoal) return;
    const nextGrid: GridConnection =
      nextGoal === "backup_resilience" && value.gridConnection === "grid-tied"
        ? "hybrid"
        : value.gridConnection;
    onChange({
      ...value,
      gridConnection: nextGrid,
      planningProfile: {
        scale: activeScale,
        jurisdiction: value.region,
        goal: nextGoal,
      },
    });
  };

  const handleRegionSelect = (nextRegion: RegionType) => {
    setRegionManuallyOverridden(true);
    const shouldUpdateTariff =
      value.electricityTariffUsd === REGION_TARIFF_DEFAULTS[value.region];
    const nextTariff = shouldUpdateTariff
      ? REGION_TARIFF_DEFAULTS[nextRegion]
      : value.electricityTariffUsd;
    setTariffDraft(formatDecimalInput(nextTariff));
    onChange({
      ...value,
      region: nextRegion,
      electricityTariffUsd: nextTariff,
      planningProfile: {
        scale: activeScale,
        jurisdiction: nextRegion,
        goal: activeGoal,
      },
    });
  };

  const handleResetRegionToMap = () => {
    setRegionManuallyOverridden(false);
    const nextTariff = REGION_TARIFF_DEFAULTS[inferredRegion];
    setTariffDraft(formatDecimalInput(nextTariff));
    onChange({
      ...value,
      region: inferredRegion,
      electricityTariffUsd: nextTariff,
      planningProfile: {
        scale: activeScale,
        jurisdiction: inferredRegion,
        goal: activeGoal,
      },
    });
  };

  const commitTariff = () => {
    const nextValue = clampNumber(Number(tariffDraft), 0.01, 5.0);
    setTariffDraft(formatDecimalInput(nextValue));
    update("electricityTariffUsd", nextValue);
  };

  const commitPerformanceRatio = () => {
    const nextValue = clampNumber(Number(performanceDraft), 0.5, 0.95);
    setPerformanceDraft(formatDecimalInput(nextValue));
    update("performanceRatio", nextValue);
  };

  const commitCapacity = () => {
    const nextValue = clampNumber(Number(capacityDraft), 0.5, 5000);
    setCapacityDraft(formatDecimalInput(nextValue));
    update("systemCapacityKw", nextValue);
  };

  const commitBattery = () => {
    const trimmed = batteryDraft.trim();
    if (!trimmed) {
      update("batteryCapacityKwh", undefined);
      return;
    }
    const nextValue = clampNumber(Number(trimmed), 0, 200000);
    setBatteryDraft(formatDecimalInput(nextValue));
    update("batteryCapacityKwh", nextValue);
  };

  const handleBillChange = (raw: string) => {
    setBillDraft(raw);
    const num = Number(raw);
    if (raw.trim() === "" || Number.isNaN(num) || num <= 0) {
      onChange({ ...value, monthlyBillUsd: undefined });
    } else {
      onChange({
        ...value,
        monthlyBillUsd: num,
        monthlyConsumptionKwh: undefined,
      });
    }
  };

  const handleUsageKwhChange = (raw: string) => {
    setUsageKwhDraft(raw);
    const num = Number(raw);
    if (raw.trim() === "" || Number.isNaN(num) || num <= 0) {
      onChange({ ...value, monthlyConsumptionKwh: undefined });
    } else {
      onChange({
        ...value,
        monthlyConsumptionKwh: num,
        monthlyBillUsd: undefined,
      });
    }
  };

  const handleRoofAreaChange = (raw: string) => {
    setRoofAreaDraft(raw);
    const num = Number(raw);
    if (raw.trim() === "" || Number.isNaN(num) || num <= 0) {
      update("availableRoofAreaM2", undefined);
    } else {
      const m2 = Math.round(convertAreaToM2(num) * 10) / 10;
      update("availableRoofAreaM2", m2);
    }
  };

  const handleCommitKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void,
  ) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      commit();
    }
  };

  const effectiveTariff = Math.max(0.01, value.electricityTariffUsd || 0.12);
  const estimatedPeakSunHours =
    Math.abs(lat) < 25 ? 5.2 : Math.abs(lat) < 40 ? 4.6 : 3.8;
  const targetOffsetRatio = activeGoal === "max_offset" ? 1.05 : 1.0;

  const inferredMonthlyKwh =
    sizingMode === "kwh" && value.monthlyConsumptionKwh && value.monthlyConsumptionKwh > 0
      ? value.monthlyConsumptionKwh
      : sizingMode === "bill" && value.monthlyBillUsd && value.monthlyBillUsd > 0
        ? value.monthlyBillUsd / effectiveTariff
        : null;

  const recommendedKw =
    inferredMonthlyKwh && inferredMonthlyKwh > 0
      ? Math.round(
          Math.max(
            0.5,
            ((inferredMonthlyKwh / 30) * targetOffsetRatio) /
              (estimatedPeakSunHours * performanceValue),
          ) * 10,
        ) / 10
      : null;

  const maxKwByRoof =
    value.availableRoofAreaM2 && value.availableRoofAreaM2 > 0
      ? Math.round((value.availableRoofAreaM2 / ROOF_AREA_M2_PER_KW) * 10) / 10
      : null;

  const sizingBasisKw = recommendedKw ?? value.systemCapacityKw;
  const requiredRoofM2 = Math.round(sizingBasisKw * ROOF_AREA_M2_PER_KW * 10) / 10;
  const estimatedPanels = Math.ceil((sizingBasisKw * 1000) / PANEL_WATT_PEAK);
  const isRoofConstrained =
    maxKwByRoof !== null && sizingBasisKw > maxKwByRoof;

  const autoSizedBatteryKwh =
    value.gridConnection === "hybrid"
      ? Math.round(value.systemCapacityKw * 2.0 * 10) / 10
      : value.gridConnection === "off-grid"
        ? Math.round(value.systemCapacityKw * 3.5 * 10) / 10
        : 0;

  const includeIncentives = value.includeIncentives ?? true;
  const selectedModel: MlModelType = value.model ?? "hist_gradient_boosting";

  return (
    <FieldGroup className="gap-6">
      {/* ── Top Mode Switch: Guided Profile vs Ad-hoc Custom Setup ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={setupMode}
          onValueChange={(next) => {
            if (next === "guided" || next === "custom") setSetupMode(next);
          }}
          className="w-full sm:w-auto"
        >
          <ToggleGroupItem value="guided" className="px-3">
            <Calculator className="size-3.5" aria-hidden />
            Guided profile &amp; bill sizing
          </ToggleGroupItem>
          <ToggleGroupItem value="custom" className="px-3">
            <Cpu className="size-3.5" aria-hidden />
            Ad-hoc engineering setup
          </ToggleGroupItem>
        </ToggleGroup>

        <Badge variant="secondary" className="font-mono text-xs font-normal">
          {value.systemCapacityKw.toFixed(1)} kW · ~{Math.ceil((value.systemCapacityKw * 1000) / PANEL_WATT_PEAK)} panels · {formatArea(Math.round(value.systemCapacityKw * ROOF_AREA_M2_PER_KW), 0)}
        </Badge>
      </div>

      {setupMode === "guided" ? (
        <FieldGroup className="gap-5">
          {/* Scale Tier & Goal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSet>
              <FieldLegend className="text-xs text-muted-foreground">
                Property scale
              </FieldLegend>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={activeScale}
                onValueChange={(v) => handleScaleChange(v as PlanningScale)}
                disabled={disabled}
                className="grid w-full grid-cols-3 gap-1.5"
              >
                {(Object.keys(SCALE_PRESETS) as PlanningScale[]).map((scaleKey) => (
                  <ToggleGroupItem key={scaleKey} value={scaleKey} className="truncate px-2">
                    {SCALE_PRESETS[scaleKey].label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="text-xs text-muted-foreground">
                Primary goal
              </FieldLegend>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={activeGoal}
                onValueChange={(v) => handleGoalChange(v as PlanningGoal)}
                disabled={disabled}
                className="grid w-full grid-cols-3 gap-1.5"
              >
                {GOAL_OPTIONS.map((goal) => (
                  <ToggleGroupItem key={goal.id} value={goal.id} className="truncate px-2">
                    {goal.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldSet>
          </div>

          <Separator />

          {/* Bill / Usage & Roof Area Inputs */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                Size from electricity bill or usage
              </span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={sizingMode}
                onValueChange={(v) => {
                  if (v === "bill" || v === "kwh") setSizingMode(v);
                }}
              >
                <ToggleGroupItem value="bill" className="h-7 px-2.5 text-xs">
                  Monthly bill ($)
                </ToggleGroupItem>
                <ToggleGroupItem value="kwh" className="h-7 px-2.5 text-xs">
                  Monthly kWh
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sizingMode === "bill" ? (
                <Field>
                  <FieldLabel htmlFor="monthlyBillUsd">
                    Monthly electricity bill (USD)
                  </FieldLabel>
                  <Input
                    id="monthlyBillUsd"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 150"
                    disabled={disabled}
                    value={billDraft}
                    onChange={(e) => handleBillChange(e.target.value)}
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="monthlyConsumptionKwh">
                    Monthly electricity usage (kWh)
                  </FieldLabel>
                  <Input
                    id="monthlyConsumptionKwh"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 950"
                    disabled={disabled}
                    value={usageKwhDraft}
                    onChange={(e) => handleUsageKwhChange(e.target.value)}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="availableRoofArea">
                  Available roof or ground area ({areaUnit})
                </FieldLabel>
                <Input
                  id="availableRoofArea"
                  type="text"
                  inputMode="decimal"
                  placeholder={areaUnit === "sq ft" ? "e.g. 450" : "e.g. 42"}
                  disabled={disabled}
                  value={roofAreaDraft}
                  onChange={(e) => handleRoofAreaChange(e.target.value)}
                />
              </Field>
            </div>

            {recommendedKw !== null ? (
              <Alert className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <AlertTitle className="text-xs font-semibold">
                    Recommended size: {recommendedKw.toFixed(1)} kW (~{estimatedPanels} panels · {formatArea(requiredRoofM2, 0)})
                  </AlertTitle>
                  {isRoofConstrained && maxKwByRoof !== null ? (
                    <AlertDescription className="mt-0.5 flex items-center gap-1 text-xs text-status-warn">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                      Available area limits array to {maxKwByRoof.toFixed(1)} kW
                    </AlertDescription>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  className="h-8 shrink-0 text-xs"
                  onClick={() => {
                    const targetKw =
                      isRoofConstrained && maxKwByRoof !== null
                        ? maxKwByRoof
                        : recommendedKw;
                    setCapacityDraft(formatDecimalInput(targetKw));
                    update("systemCapacityKw", targetKw);
                  }}
                >
                  <Sparkles className="mr-1.5 size-3.5" aria-hidden />
                  Apply {(isRoofConstrained && maxKwByRoof !== null ? maxKwByRoof : recommendedKw).toFixed(1)} kW
                </Button>
              </Alert>
            ) : null}
          </div>
        </FieldGroup>
      ) : null}

      <Separator />

      {/* ── Core Capacity, Region & Tariff ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="systemCapacityKw">System capacity (kW)</FieldLabel>
            <span className="font-mono text-xs text-muted-foreground">
              {scalePreset.rangeLabel}
            </span>
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
            value={[sliderCapacityValue]}
            min={scalePreset.minKw}
            max={scalePreset.maxKw}
            step={scalePreset.stepKw}
            onValueChange={(next) => {
              const nextValue = clampNumber(
                next[0] ?? sliderCapacityValue,
                scalePreset.minKw,
                scalePreset.maxKw,
              );
              setCapacityDraft(formatDecimalInput(nextValue));
              update("systemCapacityKw", nextValue);
            }}
            disabled={disabled}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <div className="flex items-center justify-between gap-1">
              <FieldLabel htmlFor="region">Region</FieldLabel>
              {regionManuallyOverridden && !coordinatesLocked ? (
                <button
                  type="button"
                  onClick={handleResetRegionToMap}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <Unlock className="size-3" aria-hidden />
                  Auto
                </button>
              ) : null}
            </div>
            <Select
              value={value.region}
              onValueChange={(v) => handleRegionSelect(v as RegionType)}
              disabled={disabled}
            >
              <SelectTrigger id="region">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(["india", "usa", "europe", "global"] as RegionType[]).map(
                    (region) => (
                      <SelectItem key={region} value={region}>
                        {REGION_LABELS[region]}
                      </SelectItem>
                    ),
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="electricityTariffUsd">
              Tariff ($/kWh)
            </FieldLabel>
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
          </Field>
        </div>
      </div>

      {/* ── Hardware & Grid Topology via Clean ToggleGroups ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FieldSet>
          <FieldLegend className="text-xs text-muted-foreground">
            Mounting
          </FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value.installationType}
            onValueChange={(v) => {
              if (v) update("installationType", v as InstallationType);
            }}
            disabled={disabled}
            className="flex flex-col items-stretch gap-1.5 w-full"
          >
            <ToggleGroupItem value="rooftop" className="justify-between px-3">
              <span>Rooftop</span>
              <span className="text-[11px] text-muted-foreground">Roof</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="ground-mounted" className="justify-between px-3">
              <span>Ground</span>
              <span className="text-[11px] text-muted-foreground">Field</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="carport" className="justify-between px-3">
              <span>Carport</span>
              <span className="text-[11px] text-muted-foreground">Canopy</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend className="text-xs text-muted-foreground">
            Panel type
          </FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value.panelTechnology}
            onValueChange={(v) => {
              if (v) update("panelTechnology", v as PanelTechnology);
            }}
            disabled={disabled}
            className="flex flex-col items-stretch gap-1.5 w-full"
          >
            <ToggleGroupItem value="monocrystalline" className="justify-between px-3">
              <span>Monocrystalline</span>
              <span className="font-mono text-[11px] text-muted-foreground">20%</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="polycrystalline" className="justify-between px-3">
              <span>Polycrystalline</span>
              <span className="font-mono text-[11px] text-muted-foreground">17%</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="thin-film" className="justify-between px-3">
              <span>Thin-film</span>
              <span className="font-mono text-[11px] text-muted-foreground">11%</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend className="text-xs text-muted-foreground">
            Grid &amp; battery
          </FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value.gridConnection}
            onValueChange={(v) => {
              if (v) update("gridConnection", v as GridConnection);
            }}
            disabled={disabled}
            className="flex flex-col items-stretch gap-1.5 w-full"
          >
            <ToggleGroupItem value="grid-tied" className="justify-between px-3">
              <span>Grid-tied</span>
              <span className="text-[11px] text-muted-foreground">Export</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="hybrid" className="justify-between px-3">
              <span>Hybrid</span>
              <span className="text-[11px] text-muted-foreground">+ Battery</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="off-grid" className="justify-between px-3">
              <span>Off-grid</span>
              <span className="text-[11px] text-muted-foreground">Island</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </FieldSet>
      </div>

      {/* Conditional Battery Capacity Input */}
      {(value.gridConnection === "hybrid" || value.gridConnection === "off-grid") && (
        <Field orientation="horizontal" className="border-t border-tile-border pt-4">
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="batteryCapacityKwh" className="inline-flex items-center gap-1.5">
              <BatteryCharging className="size-3.5 text-primary" aria-hidden />
              Battery storage capacity (kWh)
            </FieldLabel>
            <FieldDescription>
              Defaults to {autoSizedBatteryKwh} kWh LFP storage if left blank.
            </FieldDescription>
          </div>
          <Input
            id="batteryCapacityKwh"
            type="text"
            inputMode="decimal"
            placeholder={`${autoSizedBatteryKwh} kWh`}
            disabled={disabled}
            value={batteryDraft}
            onChange={(e) => setBatteryDraft(e.target.value)}
            onBlur={commitBattery}
            onKeyDown={(event) => handleCommitKeyDown(event, commitBattery)}
            className="w-32 text-right font-mono"
          />
        </Field>
      )}

      {/* Subsidy Toggle */}
      <Field orientation="horizontal" className="border-t border-tile-border pt-4">
        <div className="flex flex-col gap-0.5 pr-4">
          <FieldLabel htmlFor="includeIncentives">
            Include regional subsidies &amp; tax credits
          </FieldLabel>
          <FieldDescription>
            {REGION_SUBSIDY_HINT[value.region]}
          </FieldDescription>
        </div>
        <Switch
          id="includeIncentives"
          checked={includeIncentives}
          onCheckedChange={(checked) => update("includeIncentives", checked)}
          disabled={disabled}
        />
      </Field>

      {/* Ad-hoc Engineering Parameters (shown in Custom mode) */}
      {setupMode === "custom" ? (
        <div className="flex flex-col gap-5 border-t border-tile-border pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="performanceRatio">Performance ratio</FieldLabel>
                <span className="font-mono text-xs text-muted-foreground">
                  {performanceValue.toFixed(2)}
                </span>
              </div>
              <Input
                id="performanceRatio"
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={performanceDraft}
                onChange={(e) => setPerformanceDraft(e.target.value)}
                onBlur={commitPerformanceRatio}
                onKeyDown={(event) =>
                  handleCommitKeyDown(event, commitPerformanceRatio)
                }
              />
              <Slider
                value={[performanceValue]}
                min={0.5}
                max={0.95}
                step={0.01}
                onValueChange={(next) => {
                  const nextValue = clampNumber(
                    next[0] ?? performanceValue,
                    0.5,
                    0.95,
                  );
                  setPerformanceDraft(formatDecimalInput(nextValue));
                  update("performanceRatio", nextValue);
                }}
                disabled={disabled}
              />
              <FieldDescription>
                Accounts for inverter, wiring, temperature, and soiling losses.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="mlModelSelector">Prediction estimator</FieldLabel>
              <Select
                value={selectedModel}
                onValueChange={(v) => update("model", v as MlModelType)}
                disabled={disabled}
              >
                <SelectTrigger id="mlModelSelector" className="w-full min-w-0">
                  <SelectValue placeholder="Select estimator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {MODEL_OPTIONS.find((m) => m.value === selectedModel)?.detail}
              </FieldDescription>
            </Field>
          </div>

          <FieldSet>
            <FieldLegend className="text-xs text-muted-foreground">
              Exact coordinates
            </FieldLegend>
            <CoordinateInput
              lat={lat}
              lon={lon}
              onLatChange={onLatChange}
              onLonChange={onLonChange}
              disabled={coordinatesLocked}
            />
          </FieldSet>
        </div>
      ) : null}
    </FieldGroup>
  );
}
