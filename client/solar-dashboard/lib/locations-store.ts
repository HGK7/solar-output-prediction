"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AnalysisResult,
  Coordinates,
  SavedAnalysisRun,
  SavedLocationMetadata,
  SavedLocationRecord,
  SavedLocationsStoreState,
  SavedSystemConfig,
} from "@/types";

const STORAGE_KEY = "solar-dashboard:saved-locations";
const STORE_VERSION = 1;

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

function normalizeSystemConfig(value: unknown): SavedSystemConfig {
  if (!isRecord(value)) {
    return DEFAULT_SYSTEM_CONFIG;
  }

  return {
    installationType:
      value.installationType === "ground-mounted" ||
        value.installationType === "carport" ||
        value.installationType === "rooftop"
        ? value.installationType
        : DEFAULT_SYSTEM_CONFIG.installationType,
    panelTechnology:
      value.panelTechnology === "polycrystalline" ||
        value.panelTechnology === "thin-film" ||
        value.panelTechnology === "monocrystalline"
        ? value.panelTechnology
        : DEFAULT_SYSTEM_CONFIG.panelTechnology,
    gridConnection:
      value.gridConnection === "hybrid" ||
        value.gridConnection === "off-grid" ||
        value.gridConnection === "grid-tied"
        ? value.gridConnection
        : DEFAULT_SYSTEM_CONFIG.gridConnection,
    region:
      value.region === "india" || value.region === "usa" || value.region === "europe" || value.region === "global"
        ? value.region
        : DEFAULT_SYSTEM_CONFIG.region,
    systemCapacityKw:
      typeof value.systemCapacityKw === "number" && Number.isFinite(value.systemCapacityKw)
        ? value.systemCapacityKw
        : DEFAULT_SYSTEM_CONFIG.systemCapacityKw,
    electricityTariffUsd:
      typeof value.electricityTariffUsd === "number" && Number.isFinite(value.electricityTariffUsd)
        ? value.electricityTariffUsd
        : DEFAULT_SYSTEM_CONFIG.electricityTariffUsd,
    performanceRatio:
      typeof value.performanceRatio === "number" && Number.isFinite(value.performanceRatio)
        ? value.performanceRatio
        : DEFAULT_SYSTEM_CONFIG.performanceRatio,
  };
}

function normalizeLocationRecord(value: unknown): SavedLocationRecord | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    coordinates:
      isRecord(value.coordinates) &&
        typeof value.coordinates.lat === "number" &&
        typeof value.coordinates.lon === "number"
        ? { lat: value.coordinates.lat, lon: value.coordinates.lon }
        : { lat: 0, lon: 0 },
    systemConfig: normalizeSystemConfig(value.systemConfig),
    metadata: normalizeMetadata(value.metadata),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    latestRun: normalizeSavedRun(value.latestRun),
  };
}

function normalizeSavedRun(value: unknown): SavedAnalysisRun | null {
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

  return {
    id: value.id,
    createdAt: value.createdAt,
    summary: {
      annualOutputKwh: summary.annualOutputKwh,
      annualSavingsUsd: summary.annualSavingsUsd,
      paybackYears: summary.paybackYears,
      confidence: summary.confidence,
      modelUsed: summary.modelUsed,
    },
    result: result,
  };
}

function toSafeState(value: unknown): SavedLocationsStoreState {
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
}

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

export function createSavedRunFromAnalysis(result: AnalysisResult): SavedAnalysisRun {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    summary: {
      annualOutputKwh: result.financial.annual_output_kwh,
      annualSavingsUsd: result.financial.annual_savings_usd,
      paybackYears: result.financial.simple_payback_years,
      confidence: result.explanation.confidence_assessment,
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
    systemConfig: input.systemConfig,
    metadata: {
      ...DEFAULT_LOCATION_METADATA,
      ...input.metadata,
      tags: input.metadata?.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    },
    createdAt: now,
    updatedAt: now,
    latestRun: null,
  };
}

export function useLocationsStore() {
  const [locations, setLocations] = useState<SavedLocationRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const state = readLocationsStore();
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
            latestRun: run,
            updatedAt: new Date().toISOString(),
          }
          : location,
      ),
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
      clearAll,
    ],
  );
}
