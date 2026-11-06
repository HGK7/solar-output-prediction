"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AnalysisResult,
  Coordinates,
  PlanningGoal,
  PlanningProfile,
  PlanningScale,
  SavedAnalysisRun,
  SavedGridConnection,
  SavedInstallationType,
  SavedLocationMetadata,
  SavedLocationRecord,
  SavedLocationsStoreState,
  SavedPanelTechnology,
  SavedRegionType,
  SavedSystemConfig,
} from "@/types";

const STORAGE_KEY = "solar-dashboard:saved-locations";
const STORE_VERSION = 3;

const EMPTY_STATE: SavedLocationsStoreState = {
  version: STORE_VERSION,
  locations: [],
};

const DEFAULT_LOCATION_METADATA: SavedLocationMetadata = {
  ownerName: "",
  installationDate: null,
  notes: "",
  tags: [],
};

const DEFAULT_SYSTEM_CONFIG: SavedSystemConfig = {
  installationType: "rooftop",
  panelTechnology: "monocrystalline",
  gridConnection: "grid-tied",
  region: "global",
  systemCapacityKw: 5,
  electricityTariffUsd: 0.12,
  performanceRatio: 0.78,
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeMetadata(value: unknown): SavedLocationMetadata {
  if (!isRecord(value)) {
    return DEFAULT_LOCATION_METADATA;
  }

  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
    : [];

  return {
    ownerName: typeof value.ownerName === "string" ? value.ownerName : DEFAULT_LOCATION_METADATA.ownerName,
    installationDate:
      typeof value.installationDate === "string" || value.installationDate === null
        ? value.installationDate
        : DEFAULT_LOCATION_METADATA.installationDate,
    notes: typeof value.notes === "string" ? value.notes : DEFAULT_LOCATION_METADATA.notes,
    tags,
  };
}

function isSavedRegion(value: unknown): value is SavedRegionType {
  return value === "india" || value === "usa" || value === "europe" || value === "global";
}

function isSavedInstallationType(value: unknown): value is SavedInstallationType {
  return value === "rooftop" || value === "ground-mounted" || value === "carport";
}

function isSavedPanelTechnology(value: unknown): value is SavedPanelTechnology {
  return value === "monocrystalline" || value === "polycrystalline" || value === "thin-film";
}

function isSavedGridConnection(value: unknown): value is SavedGridConnection {
  return value === "grid-tied" || value === "hybrid" || value === "off-grid";
}

function isPlanningScale(value: unknown): value is PlanningScale {
  return value === "homeowner" || value === "small_business" || value === "industrial";
}

function isPlanningGoal(value: unknown): value is PlanningGoal {
  return value === "lowest_payback" || value === "max_offset" || value === "backup_resilience";
}

function normalizePlanningProfile(value: unknown): PlanningProfile | undefined {
  if (!isRecord(value)) return undefined;
  if (!isPlanningScale(value.scale) || !isSavedRegion(value.jurisdiction) || !isPlanningGoal(value.goal)) {
    return undefined;
  }
  return {
    scale: value.scale,
    jurisdiction: value.jurisdiction,
    goal: value.goal,
  };
}

function inferPanelTechnologyFromEfficiency(efficiency?: number): SavedPanelTechnology | undefined {
  if (typeof efficiency !== "number" || !Number.isFinite(efficiency)) return undefined;
  if (efficiency >= 0.185) return "monocrystalline";
  if (efficiency >= 0.14) return "polycrystalline";
  return "thin-film";
}

function inferSystemConfigFromResult(
  result: AnalysisResult,
  fallbackConfig?: SavedSystemConfig,
): SavedSystemConfig {
  const base = fallbackConfig ?? DEFAULT_SYSTEM_CONFIG;
  const sysParams = isRecord(result?.financial?.system_parameters)
    ? result.financial.system_parameters
    : null;
  const physAssumptions = isRecord(result?.physics_simulation?.assumptions)
    ? result.physics_simulation.assumptions
    : null;

  const region =
    sysParams && isSavedRegion(sysParams.region)
      ? sysParams.region
      : base.region;

  const systemCapacityKw =
    sysParams && typeof sysParams.capacity_kw === "number" && Number.isFinite(sysParams.capacity_kw)
      ? sysParams.capacity_kw
      : physAssumptions && typeof physAssumptions.system_capacity_kw === "number" && Number.isFinite(physAssumptions.system_capacity_kw)
        ? physAssumptions.system_capacity_kw
        : base.systemCapacityKw;

  const electricityTariffUsd =
    sysParams && typeof sysParams.electricity_tariff_usd_kwh === "number" && Number.isFinite(sysParams.electricity_tariff_usd_kwh)
      ? sysParams.electricity_tariff_usd_kwh
      : base.electricityTariffUsd;

  const performanceRatio =
    sysParams && typeof sysParams.performance_ratio === "number" && Number.isFinite(sysParams.performance_ratio)
      ? sysParams.performance_ratio
      : physAssumptions && typeof physAssumptions.performance_ratio === "number" && Number.isFinite(physAssumptions.performance_ratio)
        ? physAssumptions.performance_ratio
        : base.performanceRatio;

  const panelTechnology =
    physAssumptions && isSavedPanelTechnology(physAssumptions.panel_technology)
      ? physAssumptions.panel_technology
      : inferPanelTechnologyFromEfficiency(sysParams?.panel_efficiency) ?? base.panelTechnology;

  const installationType =
    physAssumptions && isSavedInstallationType(physAssumptions.installation_type)
      ? physAssumptions.installation_type
      : base.installationType;

  const modelUsed = result?.prediction?.model_used;
  const model =
    modelUsed === "linear_regression" ||
    modelUsed === "svm" ||
    modelUsed === "random_forest" ||
    modelUsed === "hist_gradient_boosting"
      ? modelUsed
      : base.model;

  const batteryCapacityKwh =
    result?.financial?.battery_summary && typeof result.financial.battery_summary.capacity_kwh === "number"
      ? result.financial.battery_summary.capacity_kwh
      : base.batteryCapacityKwh;

  return {
    ...base,
    installationType,
    panelTechnology,
    gridConnection: base.gridConnection,
    region,
    systemCapacityKw,
    electricityTariffUsd,
    performanceRatio,
    ...(model ? { model } : {}),
    ...(batteryCapacityKwh !== undefined ? { batteryCapacityKwh } : {}),
  };
}

function normalizeSystemConfig(value: unknown, fallback: SavedSystemConfig = DEFAULT_SYSTEM_CONFIG): SavedSystemConfig {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const normalized: SavedSystemConfig = {
    installationType: isSavedInstallationType(value.installationType)
      ? value.installationType
      : fallback.installationType,
    panelTechnology: isSavedPanelTechnology(value.panelTechnology)
      ? value.panelTechnology
      : fallback.panelTechnology,
    gridConnection: isSavedGridConnection(value.gridConnection)
      ? value.gridConnection
      : fallback.gridConnection,
    region: isSavedRegion(value.region)
      ? value.region
      : fallback.region,
    systemCapacityKw:
      typeof value.systemCapacityKw === "number" && Number.isFinite(value.systemCapacityKw)
        ? value.systemCapacityKw
        : fallback.systemCapacityKw,
    electricityTariffUsd:
      typeof value.electricityTariffUsd === "number" && Number.isFinite(value.electricityTariffUsd)
        ? value.electricityTariffUsd
        : fallback.electricityTariffUsd,
    performanceRatio:
      typeof value.performanceRatio === "number" && Number.isFinite(value.performanceRatio)
        ? value.performanceRatio
        : fallback.performanceRatio,
  };

  if (
    value.model === "linear_regression" ||
    value.model === "svm" ||
    value.model === "random_forest" ||
    value.model === "hist_gradient_boosting"
  ) {
    normalized.model = value.model;
  } else if (fallback.model) {
    normalized.model = fallback.model;
  }

  if (typeof value.batteryCapacityKwh === "number" && Number.isFinite(value.batteryCapacityKwh)) {
    normalized.batteryCapacityKwh = value.batteryCapacityKwh;
  } else if (fallback.batteryCapacityKwh !== undefined) {
    normalized.batteryCapacityKwh = fallback.batteryCapacityKwh;
  }

  if (typeof value.includeIncentives === "boolean") {
    normalized.includeIncentives = value.includeIncentives;
  } else if (fallback.includeIncentives !== undefined) {
    normalized.includeIncentives = fallback.includeIncentives;
  }

  if (typeof value.monthlyBillUsd === "number" && Number.isFinite(value.monthlyBillUsd)) {
    normalized.monthlyBillUsd = value.monthlyBillUsd;
  } else if (fallback.monthlyBillUsd !== undefined) {
    normalized.monthlyBillUsd = fallback.monthlyBillUsd;
  }

  if (typeof value.monthlyConsumptionKwh === "number" && Number.isFinite(value.monthlyConsumptionKwh)) {
    normalized.monthlyConsumptionKwh = value.monthlyConsumptionKwh;
  } else if (fallback.monthlyConsumptionKwh !== undefined) {
    normalized.monthlyConsumptionKwh = fallback.monthlyConsumptionKwh;
  }

  if (typeof value.availableRoofAreaM2 === "number" && Number.isFinite(value.availableRoofAreaM2)) {
    normalized.availableRoofAreaM2 = value.availableRoofAreaM2;
  } else if (fallback.availableRoofAreaM2 !== undefined) {
    normalized.availableRoofAreaM2 = fallback.availableRoofAreaM2;
  }

  const planningProfile = normalizePlanningProfile(value.planningProfile) ?? fallback.planningProfile;
  if (planningProfile) {
    normalized.planningProfile = planningProfile;
  }

  return normalized;
}

export function normalizeSavedRun(
  value: unknown,
  parentSystemConfig?: SavedSystemConfig,
): SavedAnalysisRun | null {
  if (!isRecord(value)) return null;

  if (typeof value.id !== "string" || typeof value.createdAt !== "string") return null;

  const summary = isRecord(value.summary) ? value.summary : null;
  if (
    !summary ||
    typeof summary.annualOutputKwh !== "number" ||
    typeof summary.annualSavingsUsd !== "number" ||
    typeof summary.paybackYears !== "number" ||
    (summary.confidence !== "low" && summary.confidence !== "medium" && summary.confidence !== "high") ||
    typeof summary.modelUsed !== "string"
  ) {
    return null;
  }

  const result = isRecord(value.result) ? (value.result as unknown as AnalysisResult) : null;
  if (!result || !isRecord(result.prediction) || !isRecord(result.financial)) return null;

  const inferredFallback = inferSystemConfigFromResult(result, parentSystemConfig);
  const systemConfig = isRecord(value.systemConfig)
    ? normalizeSystemConfig(value.systemConfig, inferredFallback)
    : inferredFallback;

  const label = typeof value.label === "string" && value.label.trim().length > 0 ? value.label.trim() : undefined;

  return {
    id: value.id,
    createdAt: value.createdAt,
    ...(label ? { label } : {}),
    systemConfig,
    summary: {
      annualOutputKwh: summary.annualOutputKwh,
      annualSavingsUsd: summary.annualSavingsUsd,
      paybackYears: summary.paybackYears,
      confidence: summary.confidence,
      modelUsed: summary.modelUsed,
    },
    result,
  };
}

export function normalizeLocationRecord(value: unknown): SavedLocationRecord | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  const locationSystemConfig = normalizeSystemConfig(value.systemConfig);
  const legacyLatestRun = normalizeSavedRun(value.latestRun, locationSystemConfig);
  const runs = Array.isArray(value.runs)
    ? value.runs
        .map((run) => normalizeSavedRun(run, locationSystemConfig))
        .filter((item): item is SavedAnalysisRun => item !== null)
    : legacyLatestRun
      ? [legacyLatestRun]
      : [];
  const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;

  return {
    id: value.id,
    name: value.name,
    coordinates:
      isRecord(value.coordinates) &&
      typeof value.coordinates.lat === "number" &&
      typeof value.coordinates.lon === "number"
        ? { lat: value.coordinates.lat, lon: value.coordinates.lon }
        : { lat: 0, lon: 0 },
    systemConfig: locationSystemConfig,
    metadata: normalizeMetadata(value.metadata),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    runs,
    latestRun,
  };
}

export function toSafeState(value: unknown): SavedLocationsStoreState {
  if (!value || typeof value !== "object") {
    return EMPTY_STATE;
  }

  const raw = value as Partial<SavedLocationsStoreState>;
  const locations = Array.isArray(raw.locations)
    ? raw.locations.map(normalizeLocationRecord).filter((item): item is SavedLocationRecord => item !== null)
    : [];

  return {
    version: STORE_VERSION,
    locations,
  };
}

export function readLocationsStore(): SavedLocationsStoreState {
  if (!canUseStorage()) return EMPTY_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return toSafeState(JSON.parse(raw));
  } catch {
    return EMPTY_STATE;
  }
}

export function writeLocationsStore(state: SavedLocationsStoreState) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: STORE_VERSION,
      locations: state.locations,
    }),
  );
  window.dispatchEvent(new Event(LOCATIONS_CHANGED_EVENT));
}

export const LOCATIONS_CHANGED_EVENT = "solar-dashboard:locations-changed";

export interface CreateLocationInput {
  name: string;
  coordinates: Coordinates;
  systemConfig: SavedSystemConfig;
  metadata?: Partial<SavedLocationMetadata>;
}

function normalizeLocationName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Location name is required.");
  }

  return trimmed;
}

export function createSavedRunFromAnalysis(
  result: AnalysisResult,
  systemConfig?: SavedSystemConfig,
  label?: string,
): SavedAnalysisRun {
  const inferred = inferSystemConfigFromResult(result, systemConfig);
  const finalSystemConfig = systemConfig
    ? normalizeSystemConfig(systemConfig, inferred)
    : inferred;
  const trimmedLabel = typeof label === "string" && label.trim().length > 0 ? label.trim() : undefined;

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...(trimmedLabel ? { label: trimmedLabel } : {}),
    systemConfig: finalSystemConfig,
    summary: {
      annualOutputKwh: result.financial.annual_output_kwh,
      annualSavingsUsd: result.financial.annual_savings_usd,
      paybackYears: result.financial.simple_payback_years,
      confidence: result.explanation?.confidence_assessment ?? "low",
      modelUsed: result.prediction.model_used,
    },
    result,
  };
}

export function createLocationRecord(input: CreateLocationInput): SavedLocationRecord {
  const now = new Date().toISOString();
  const name = normalizeLocationName(input.name);

  return {
    id: createId(),
    name,
    coordinates: input.coordinates,
    systemConfig: normalizeSystemConfig(input.systemConfig),
    metadata: {
      ...DEFAULT_LOCATION_METADATA,
      ...input.metadata,
      tags: input.metadata?.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    },
    createdAt: now,
    updatedAt: now,
    runs: [],
    latestRun: null,
  };
}

export function useLocationsStore() {
  const [locations, setLocations] = useState<SavedLocationRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const state = readLocationsStore();
    // Keep user portfolio only — never inject sample reference sites into saved locations.
    setLocations(state.locations);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    writeLocationsStore({ version: STORE_VERSION, locations });
  }, [isHydrated, locations]);

  const createLocation = useCallback((input: CreateLocationInput) => {
    const next = createLocationRecord(input);
    setLocations((prev) => [next, ...prev]);
    return next;
  }, []);

  const upsertLocation = useCallback((record: SavedLocationRecord) => {
    setLocations((prev) => {
      const index = prev.findIndex((item) => item.id === record.id);
      if (index === -1) return [record, ...prev];

      const clone = [...prev];
      clone[index] = record;
      return clone;
    });
  }, []);

  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getLocationById = useCallback(
    (id: string) => locations.find((item) => item.id === id) ?? null,
    [locations],
  );

  const attachRun = useCallback((locationId: string, run: SavedAnalysisRun) => {
    setLocations((prev) =>
      prev.map((location) =>
        location.id === locationId
          ? {
              ...location,
              runs: [...location.runs, run],
              latestRun: run,
              updatedAt: new Date().toISOString(),
            }
          : location,
      ),
    );
  }, []);

  const deleteRun = useCallback((locationId: string, runId: string) => {
    setLocations((prev) =>
      prev.map((location) => {
        if (location.id !== locationId) return location;
        const nextRuns = location.runs.filter((run) => run.id !== runId);
        const nextLatest = nextRuns.length > 0 ? nextRuns[nextRuns.length - 1] : null;
        return {
          ...location,
          runs: nextRuns,
          latestRun: nextLatest,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const clearAll = useCallback(() => {
    setLocations([]);
  }, []);

  return useMemo(
    () => ({
      locations,
      isHydrated,
      createLocation,
      upsertLocation,
      removeLocation,
      getLocationById,
      attachRun,
      deleteRun,
      clearAll,
      setLocations,
    }),
    [
      locations,
      isHydrated,
      createLocation,
      upsertLocation,
      removeLocation,
      getLocationById,
      attachRun,
      deleteRun,
      clearAll,
    ],
  );
}
