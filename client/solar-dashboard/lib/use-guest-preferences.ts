"use client";

import { useEffect, useState } from "react";

export type GuestPreferences = {
  units: "metric" | "imperial";
  notifications: boolean;
  theme: "light" | "system";
};

const STORAGE_KEY = "solar-dashboard:guest-preferences";

const DEFAULT_PREFERENCES: GuestPreferences = {
  units: "metric",
  notifications: true,
  theme: "light",
};

export function useGuestPreferences() {
  const [preferences, setPreferences] = useState<GuestPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<GuestPreferences>;
      setPreferences({
        units: parsed.units === "imperial" ? "imperial" : "metric",
        notifications: typeof parsed.notifications === "boolean" ? parsed.notifications : true,
        theme: parsed.theme === "system" ? "system" : "light",
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, []);

  const update = (next: Partial<GuestPreferences>) => {
    setPreferences((prev) => {
      const merged = { ...prev, ...next };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  return { preferences, update };
}
