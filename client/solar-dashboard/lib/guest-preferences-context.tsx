"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

export type PreferredMlModel =
  | "hist_gradient_boosting"
  | "random_forest"
  | "linear_regression"
  | "svm";

export type GuestPreferences = {
  units: "metric" | "imperial";
  notifications: boolean;
  theme: ThemePreference;
  preferredModel?: PreferredMlModel;
};

const STORAGE_KEY = "solar-dashboard:guest-preferences";
const SQFT_PER_M2 = 10.7639;

const DEFAULT_PREFERENCES: GuestPreferences = {
  units: "metric",
  notifications: true,
  theme: "light",
  preferredModel: "hist_gradient_boosting",
};

function parseTheme(value: unknown): ThemePreference {
  if (value === "dark" || value === "system") return value;
  return "light";
}

function parsePreferredModel(value: unknown): PreferredMlModel {
  if (
    value === "hist_gradient_boosting" ||
    value === "random_forest" ||
    value === "linear_regression" ||
    value === "svm"
  ) {
    return value;
  }
  return "hist_gradient_boosting";
}

interface GuestPreferencesContextValue {
  preferences: GuestPreferences;
  update: (next: Partial<GuestPreferences>) => boolean;
  lastError: string | null;
  clearError: () => void;
  formatTemperature: (celsius: number, digits?: number) => string;
  temperatureUnit: string;
  convertTemperature: (celsius: number) => number;
  formatArea: (m2: number, digits?: number) => string;
  areaUnit: "m²" | "sq ft";
  convertAreaFromM2: (m2: number) => number;
  convertAreaToM2: (displayArea: number) => number;
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
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<GuestPreferences>;
      setPreferences({
        units: parsed.units === "imperial" ? "imperial" : "metric",
        notifications:
          typeof parsed.notifications === "boolean" ? parsed.notifications : true,
        theme: parseTheme(parsed.theme),
        preferredModel: parsePreferredModel(parsed.preferredModel),
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      if (preferences.theme === "light") {
        root.classList.remove("dark");
      } else if (preferences.theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.toggle("dark", media.matches);
      }
    };

    apply();

    if (preferences.theme !== "system") return;

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.theme]);

  const update = useCallback((next: Partial<GuestPreferences>) => {
    try {
      setPreferences((prev) => {
        const merged = { ...prev, ...next };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
      setLastError(null);
      return true;
    } catch {
      setLastError("Preferences could not be saved.");
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
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

  const areaUnit: "m²" | "sq ft" = isImperial ? "sq ft" : "m²";
  const convertAreaFromM2 = useCallback(
    (m2: number) => (isImperial ? m2 * SQFT_PER_M2 : m2),
    [isImperial],
  );
  const convertAreaToM2 = useCallback(
    (displayArea: number) => (isImperial ? displayArea / SQFT_PER_M2 : displayArea),
    [isImperial],
  );
  const formatArea = useCallback(
    (m2: number, digits = 1) =>
      `${convertAreaFromM2(m2).toFixed(digits)} ${areaUnit}`,
    [convertAreaFromM2, areaUnit],
  );

  return (
    <GuestPreferencesContext.Provider
      value={{
        preferences,
        update,
        lastError,
        clearError,
        formatTemperature,
        convertTemperature,
        temperatureUnit: isImperial ? "°F" : "°C",
        formatArea,
        areaUnit,
        convertAreaFromM2,
        convertAreaToM2,
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
