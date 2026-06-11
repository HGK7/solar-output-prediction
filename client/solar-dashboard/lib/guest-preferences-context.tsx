"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

interface GuestPreferencesContextValue {
  preferences: GuestPreferences;
  update: (next: Partial<GuestPreferences>) => void;
  formatTemperature: (celsius: number, digits?: number) => string;
  temperatureUnit: string;
  convertTemperature: (celsius: number) => number;
}

const GuestPreferencesContext =
  createContext<GuestPreferencesContextValue | null>(null);

export function GuestPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<GuestPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<GuestPreferences>;
      setPreferences({
        units: parsed.units === "imperial" ? "imperial" : "metric",
        notifications:
          typeof parsed.notifications === "boolean" ? parsed.notifications : true,
        theme: parsed.theme === "system" ? "system" : "light",
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, []);

  // Apply theme globally: "system" follows OS dark mode, "light" forces light
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === "light") {
      root.classList.remove("dark");
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => root.classList.toggle("dark", media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.theme]);

  const update = useCallback((next: Partial<GuestPreferences>) => {
    setPreferences((prev) => {
      const merged = { ...prev, ...next };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const isImperial = preferences.units === "imperial";
  const convertTemperature = useCallback(
    (celsius: number) => (isImperial ? celsius * 1.8 + 32 : celsius),
    [isImperial],
  );
  const formatTemperature = useCallback(
    (celsius: number, digits = 1) =>
      `${convertTemperature(celsius).toFixed(digits)} ${isImperial ? "°F" : "°C"}`,
    [convertTemperature, isImperial],
  );

  return (
    <GuestPreferencesContext.Provider
      value={{
        preferences,
        update,
        formatTemperature,
        convertTemperature,
        temperatureUnit: isImperial ? "°F" : "°C",
      }}
    >
      {children}
    </GuestPreferencesContext.Provider>
  );
}

export function useGuestPreferencesContext(): GuestPreferencesContextValue {
  const context = useContext(GuestPreferencesContext);
  if (!context) {
    throw new Error(
      "useGuestPreferencesContext must be used within GuestPreferencesProvider",
    );
  }
  return context;
}
