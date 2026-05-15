"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

export type RegionType = "india" | "usa" | "europe" | "global";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface AnalyticsFilters {
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  regions: RegionType[];
  confidenceMin: ConfidenceLevel;
  includeAllRegions: boolean;
}

export interface ComparisonSelection {
  locationIds: string[];
  isActive: boolean;
}

const REGION_LABELS: Record<RegionType, string> = {
  india: "India",
  usa: "USA",
  europe: "Europe",
  global: "Global",
};

const REGION_TARIFF_DEFAULTS: Record<RegionType, number> = {
  india: 0.08,
  usa: 0.14,
  europe: 0.18,
  global: 0.12,
};

const REGION_CAPACITY_BOUNDS: Record<RegionType, { min: number; max: number }> = {
  india: { min: 1, max: 10000 },
  usa: { min: 0.5, max: 10000 },
  europe: { min: 1, max: 10000 },
  global: { min: 0.5, max: 10000 },
};

const CONFIDENCE_HIERARCHY: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

type AnalyticsContextValue = {
  filters: AnalyticsFilters;
  comparison: ComparisonSelection;
  updateFilters: (partial: Partial<AnalyticsFilters>) => void;
  resetFilters: () => void;
  toggleComparisonLocation: (locationId: string) => void;
  setComparisonActive: (active: boolean) => void;
  getRegionLabel: (region: RegionType) => string;
  getDefaultTariff: (region: RegionType) => number;
  getCapacityBounds: (region: RegionType) => { min: number; max: number };
  validateCapacity: (region: RegionType, capacity: number) => boolean;
  clampCapacity: (region: RegionType, capacity: number) => number;
};

const INITIAL_FILTERS: AnalyticsFilters = {
  dateRange: { from: null, to: null },
  regions: [],
  confidenceMin: "low",
  includeAllRegions: true,
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(INITIAL_FILTERS);
  const [comparison, setComparison] = useState<ComparisonSelection>({
    locationIds: [],
    isActive: false,
  });

  const updateFilters = useCallback((partial: Partial<AnalyticsFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const toggleComparisonLocation = useCallback((locationId: string) => {
    setComparison((prev) => {
      const ids = prev.locationIds;
      if (ids.includes(locationId)) {
        return { ...prev, locationIds: ids.filter((id) => id !== locationId) };
      }
      if (ids.length >= 4) {
        return prev;
      }
      return { ...prev, locationIds: [...ids, locationId] };
    });
  }, []);

  const setComparisonActive = useCallback((active: boolean) => {
    setComparison((prev) => ({ ...prev, isActive: active }));
  }, []);

  const validateCapacity = useCallback((region: RegionType, capacity: number) => {
    const bounds = REGION_CAPACITY_BOUNDS[region];
    return capacity >= bounds.min && capacity <= bounds.max;
  }, []);

  const clampCapacity = useCallback((region: RegionType, capacity: number) => {
    const bounds = REGION_CAPACITY_BOUNDS[region];
    return Math.max(bounds.min, Math.min(bounds.max, capacity));
  }, []);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      filters,
      comparison,
      updateFilters,
      resetFilters,
      toggleComparisonLocation,
      setComparisonActive,
      getRegionLabel: (region) => REGION_LABELS[region],
      getDefaultTariff: (region) => REGION_TARIFF_DEFAULTS[region],
      getCapacityBounds: (region) => REGION_CAPACITY_BOUNDS[region],
      validateCapacity,
      clampCapacity,
    }),
    [filters, comparison, updateFilters, resetFilters, toggleComparisonLocation, setComparisonActive, validateCapacity, clampCapacity],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsFilters() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalyticsFilters must be used within AnalyticsProvider");
  }
  return context;
}
