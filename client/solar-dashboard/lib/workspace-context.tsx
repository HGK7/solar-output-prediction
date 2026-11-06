"use client";

import { type ReactNode } from "react";
import { useDashboardWorkspace } from "@/lib/dashboard-workspace-context";
import type { SystemConfig } from "@/components/system-config-panel";

/**
 * Thin facade over DashboardWorkspaceProvider — single source of truth.
 * Kept so existing `useWorkspace()` call sites stay stable.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

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

export function useWorkspace(): WorkspaceContextValue {
  const dash = useDashboardWorkspace();
  return {
    state: {
      lat: dash.lat,
      lon: dash.lon,
      locationName: dash.locationName,
      saveStatus: dash.saveStatus,
      systemConfig: dash.systemConfig,
    },
    setLat: dash.setLat,
    setLon: dash.setLon,
    setLocationName: dash.setLocationName,
    setSaveStatus: dash.setSaveStatus,
    setSystemConfig: dash.setSystemConfig,
  };
}
