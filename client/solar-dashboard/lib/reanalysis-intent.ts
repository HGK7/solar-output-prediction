"use client";

import type { SystemConfig } from "@/components/system-config-panel";

const STORAGE_KEY = "solar-dashboard:reanalysis-intent";

export interface ReanalysisIntent {
  locationId: string;
  locationName: string;
  lat: number;
  lon: number;
  systemConfig: SystemConfig;
  requestedAt: number;
}

export function queueReanalysisIntent(intent: ReanalysisIntent) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // ignore storage issues
  }
}

export function consumeReanalysisIntent(): ReanalysisIntent | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as ReanalysisIntent;
  } catch {
    return null;
  }
}
