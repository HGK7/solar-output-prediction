"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { SystemConfig } from "@/components/system-config-panel";

interface WorkspaceState {
  lat: number;
  lon: number;
  locationName: string;
  saveStatus: string | null;
  systemConfig: SystemConfig;
}

interface WorkspaceContextValue {
  state: WorkspaceState;
  setLat: (lat: number) => void;
  setLon: (lon: number) => void;
  setLocationName: (name: string) => void;
  setSaveStatus: (status: string | null) => void;
  setSystemConfig: (config: SystemConfig) => void;
}

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  installationType: "rooftop",
  panelTechnology: "monocrystalline",
  gridConnection: "grid-tied",
  region: "global",
  systemCapacityKw: 5,
  electricityTariffUsd: 0.12,
  performanceRatio: 0.78,
};

const INITIAL_STATE: WorkspaceState = {
  lat: 27.5,
  lon: 71.6,
  locationName: "",
  saveStatus: null,
  systemConfig: DEFAULT_SYSTEM_CONFIG,
};

const STORAGE_KEY = "solar-dashboard:workspace-inputs";

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WorkspaceState>;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.warn("Failed to hydrate workspace state:", err);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lat: state.lat,
          lon: state.lon,
          locationName: state.locationName,
          systemConfig: state.systemConfig,
        })
      );
    } catch (err) {
      console.warn("Failed to persist workspace state:", err);
    }
  }, [state.lat, state.lon, state.locationName, state.systemConfig, isHydrated]);

  const setLat = useCallback((lat: number) => {
    setState((prev) => ({ ...prev, lat }));
  }, []);

  const setLon = useCallback((lon: number) => {
    setState((prev) => ({ ...prev, lon }));
  }, []);

  const setLocationName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, locationName: name }));
  }, []);

  const setSaveStatus = useCallback((status: string | null) => {
    setState((prev) => ({ ...prev, saveStatus: status }));
  }, []);

  const setSystemConfig = useCallback((config: SystemConfig) => {
    setState((prev) => ({ ...prev, systemConfig: config }));
  }, []);

  const value: WorkspaceContextValue = {
    state,
    setLat,
    setLon,
    setLocationName,
    setSaveStatus,
    setSystemConfig,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
