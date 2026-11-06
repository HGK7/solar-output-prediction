"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { ReactNode } from "react";
import type {
  DataProvenance,
  ExplanationResponse,
  FinancialSummary,
  GeometryResult,
  MLPhysicsDelta,
  MonthlyData,
  PhysicsSimulationResult,
  PredictionResult,
} from "@/types";
import type { SystemConfig } from "@/components/system-config-panel";

export type LoadingStage =
  | "idle"
  | "location"
  | "prediction"
  | "physics"
  | "financial"
  | "explanation"
  | "complete"
  | "error";

const DASHBOARD_WORKSPACE_KEY = "solar-dashboard:workspace";
const LEGACY_INPUTS_KEY = "solar-dashboard:workspace-inputs";
const PERSIST_DEBOUNCE_MS = 300;

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  installationType: "rooftop",
  panelTechnology: "monocrystalline",
  gridConnection: "grid-tied",
  region: "global",
  systemCapacityKw: 5,
  electricityTariffUsd: 0.12,
  performanceRatio: 0.78,
};

/** Only durable Guest Mode inputs — never full Analysis results. */
type PersistedWorkspaceInputs = {
  lat: number;
  lon: number;
  locationName: string;
  systemConfig: SystemConfig;
};

type DashboardWorkspaceSnapshot = PersistedWorkspaceInputs & {
  stage: LoadingStage;
  unsavedAnalysis: boolean;
  prediction: PredictionResult | null;
  financial: FinancialSummary | null;
  explanation: ExplanationResponse | null;
  monthly: Record<string, MonthlyData> | null;
  geometry: GeometryResult | null;
  dataProvenance: DataProvenance | null;
  annualAverages: Record<string, number> | null;
  physicsSimulation: PhysicsSimulationResult | null;
  mlVsPhysicsDelta: MLPhysicsDelta | null;
  error: string | null;
  saveStatus: string | null;
  activeDocuments: string[];
};

type DashboardWorkspaceState = DashboardWorkspaceSnapshot;

type DashboardWorkspacePatch = Pick<
  DashboardWorkspaceState,
  "lat" | "lon" | "systemConfig" | "locationName" | "saveStatus" | "unsavedAnalysis"
>;

type DashboardLifecyclePatch = Pick<DashboardWorkspaceState, "stage" | "error" | "activeDocuments">;

type DashboardResultsPatch = Pick<
  DashboardWorkspaceState,
  | "prediction"
  | "financial"
  | "explanation"
  | "monthly"
  | "geometry"
  | "dataProvenance"
  | "annualAverages"
  | "physicsSimulation"
  | "mlVsPhysicsDelta"
>;

type DashboardWorkspaceAction =
  | { type: "hydrate"; payload: Partial<PersistedWorkspaceInputs> }
  | { type: "patchWorkspace"; payload: Partial<DashboardWorkspacePatch> }
  | { type: "patchLifecycle"; payload: Partial<DashboardLifecyclePatch> }
  | { type: "patchResults"; payload: Partial<DashboardResultsPatch> }
  | { type: "resetResults" };

const INITIAL_STATE: DashboardWorkspaceState = {
  lat: 27.5,
  lon: 71.6,
  systemConfig: DEFAULT_SYSTEM_CONFIG,
  stage: "idle",
  unsavedAnalysis: false,
  locationName: "",
  prediction: null,
  financial: null,
  explanation: null,
  monthly: null,
  geometry: null,
  dataProvenance: null,
  annualAverages: null,
  physicsSimulation: null,
  mlVsPhysicsDelta: null,
  error: null,
  saveStatus: null,
  activeDocuments: [],
};

function pickPersistedInputs(
  raw: Partial<PersistedWorkspaceInputs> & Record<string, unknown>,
): Partial<PersistedWorkspaceInputs> {
  const next: Partial<PersistedWorkspaceInputs> = {};
  if (typeof raw.lat === "number" && Number.isFinite(raw.lat)) next.lat = raw.lat;
  if (typeof raw.lon === "number" && Number.isFinite(raw.lon)) next.lon = raw.lon;
  if (typeof raw.locationName === "string") next.locationName = raw.locationName;
  if (raw.systemConfig && typeof raw.systemConfig === "object") {
    next.systemConfig = { ...DEFAULT_SYSTEM_CONFIG, ...(raw.systemConfig as SystemConfig) };
  }
  return next;
}

function dashboardWorkspaceReducer(
  state: DashboardWorkspaceState,
  action: DashboardWorkspaceAction,
): DashboardWorkspaceState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.payload };
    case "patchWorkspace":
      return { ...state, ...action.payload };
    case "patchLifecycle":
      return { ...state, ...action.payload };
    case "patchResults":
      return { ...state, ...action.payload };
    case "resetResults":
      return {
        ...state,
        prediction: null,
        financial: null,
        explanation: null,
        monthly: null,
        geometry: null,
        dataProvenance: null,
        annualAverages: null,
        physicsSimulation: null,
        mlVsPhysicsDelta: null,
        error: null,
        saveStatus: null,
        activeDocuments: [],
        stage: "idle",
      };
    default:
      return state;
  }
}

type DashboardWorkspaceContextValue = {
  lat: number;
  updateWorkspace: (patch: Partial<DashboardWorkspacePatch>) => void;
  setLat: (next: number) => void;
  lon: number;
  setLon: (next: number) => void;
  systemConfig: SystemConfig;
  setSystemConfig: (next: SystemConfig) => void;
  stage: LoadingStage;
  updateLifecycle: (patch: Partial<DashboardLifecyclePatch>) => void;
  setStage: (next: LoadingStage) => void;
  unsavedAnalysis: boolean;
  setUnsavedAnalysis: (next: boolean) => void;
  error: string | null;
  setError: (next: string | null) => void;
  locationName: string;
  setLocationName: (next: string) => void;
  saveStatus: string | null;
  setSaveStatus: (next: string | null) => void;
  prediction: PredictionResult | null;
  setPrediction: (next: PredictionResult | null) => void;
  financial: FinancialSummary | null;
  setFinancial: (next: FinancialSummary | null) => void;
  explanation: ExplanationResponse | null;
  setExplanation: (next: ExplanationResponse | null) => void;
  monthly: Record<string, MonthlyData> | null;
  setMonthly: (next: Record<string, MonthlyData> | null) => void;
  geometry: GeometryResult | null;
  setGeometry: (next: GeometryResult | null) => void;
  dataProvenance: DataProvenance | null;
  setDataProvenance: (next: DataProvenance | null) => void;
  annualAverages: Record<string, number> | null;
  setAnnualAverages: (next: Record<string, number> | null) => void;
  physicsSimulation: PhysicsSimulationResult | null;
  setPhysicsSimulation: (next: PhysicsSimulationResult | null) => void;
  mlVsPhysicsDelta: MLPhysicsDelta | null;
  setMlVsPhysicsDelta: (next: MLPhysicsDelta | null) => void;
  activeDocuments: string[];
  setActiveDocuments: (next: string[]) => void;
  updateResults: (patch: Partial<DashboardResultsPatch>) => void;
  resetResults: () => void;
};

const DashboardWorkspaceContext = createContext<DashboardWorkspaceContextValue | null>(null);

export function DashboardWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardWorkspaceReducer, INITIAL_STATE);
  const hydratedRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetResults = useCallback(() => {
    dispatch({ type: "resetResults" });
  }, []);

  const updateWorkspace = useCallback((patch: Partial<DashboardWorkspacePatch>) => {
    dispatch({ type: "patchWorkspace", payload: patch });
  }, []);

  const updateLifecycle = useCallback((patch: Partial<DashboardLifecyclePatch>) => {
    dispatch({ type: "patchLifecycle", payload: patch });
  }, []);

  const updateResults = useCallback((patch: Partial<DashboardResultsPatch>) => {
    dispatch({ type: "patchResults", payload: patch });
  }, []);

  const setLat = useCallback((next: number) => updateWorkspace({ lat: next }), [updateWorkspace]);
  const setLon = useCallback((next: number) => updateWorkspace({ lon: next }), [updateWorkspace]);
  const setSystemConfig = useCallback(
    (next: SystemConfig) => updateWorkspace({ systemConfig: next }),
    [updateWorkspace],
  );
  const setStage = useCallback(
    (next: LoadingStage) => updateLifecycle({ stage: next }),
    [updateLifecycle],
  );
  const setUnsavedAnalysis = useCallback(
    (next: boolean) => updateWorkspace({ unsavedAnalysis: next }),
    [updateWorkspace],
  );
  const setError = useCallback(
    (next: string | null) => updateLifecycle({ error: next }),
    [updateLifecycle],
  );
  const setLocationName = useCallback(
    (next: string) => updateWorkspace({ locationName: next }),
    [updateWorkspace],
  );
  const setSaveStatus = useCallback(
    (next: string | null) => updateWorkspace({ saveStatus: next }),
    [updateWorkspace],
  );
  const setPrediction = useCallback(
    (next: PredictionResult | null) => updateResults({ prediction: next }),
    [updateResults],
  );
  const setFinancial = useCallback(
    (next: FinancialSummary | null) => updateResults({ financial: next }),
    [updateResults],
  );
  const setExplanation = useCallback(
    (next: ExplanationResponse | null) => updateResults({ explanation: next }),
    [updateResults],
  );
  const setMonthly = useCallback(
    (next: Record<string, MonthlyData> | null) => updateResults({ monthly: next }),
    [updateResults],
  );
  const setGeometry = useCallback(
    (next: GeometryResult | null) => updateResults({ geometry: next }),
    [updateResults],
  );
  const setDataProvenance = useCallback(
    (next: DataProvenance | null) => updateResults({ dataProvenance: next }),
    [updateResults],
  );
  const setAnnualAverages = useCallback(
    (next: Record<string, number> | null) => updateResults({ annualAverages: next }),
    [updateResults],
  );
  const setPhysicsSimulation = useCallback(
    (next: PhysicsSimulationResult | null) => updateResults({ physicsSimulation: next }),
    [updateResults],
  );
  const setMlVsPhysicsDelta = useCallback(
    (next: MLPhysicsDelta | null) => updateResults({ mlVsPhysicsDelta: next }),
    [updateResults],
  );
  const setActiveDocuments = useCallback(
    (next: string[]) => updateLifecycle({ activeDocuments: next }),
    [updateLifecycle],
  );

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(DASHBOARD_WORKSPACE_KEY) ??
        window.localStorage.getItem(LEGACY_INPUTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceInputs> &
          Record<string, unknown>;
        const inputs = pickPersistedInputs(parsed);
        if (Object.keys(inputs).length > 0) {
          dispatch({ type: "hydrate", payload: inputs });
        }
        // Rewrite compact key; drop legacy bloated snapshots.
        window.localStorage.setItem(
          DASHBOARD_WORKSPACE_KEY,
          JSON.stringify({
            lat: inputs.lat ?? INITIAL_STATE.lat,
            lon: inputs.lon ?? INITIAL_STATE.lon,
            locationName: inputs.locationName ?? "",
            systemConfig: inputs.systemConfig ?? DEFAULT_SYSTEM_CONFIG,
          } satisfies PersistedWorkspaceInputs),
        );
        window.localStorage.removeItem(LEGACY_INPUTS_KEY);
      }
    } catch (err) {
      console.warn("Dashboard workspace hydrate failed:", err);
      try {
        window.localStorage.removeItem(DASHBOARD_WORKSPACE_KEY);
      } catch {
        /* ignore */
      }
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const inputs: PersistedWorkspaceInputs = {
        lat: state.lat,
        lon: state.lon,
        locationName: state.locationName,
        systemConfig: state.systemConfig,
      };
      try {
        window.localStorage.setItem(DASHBOARD_WORKSPACE_KEY, JSON.stringify(inputs));
      } catch (err) {
        console.warn("Dashboard workspace persist failed:", err);
      }
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [state.lat, state.lon, state.locationName, state.systemConfig]);

  const value = useMemo<DashboardWorkspaceContextValue>(
    () => ({
      lat: state.lat,
      updateWorkspace,
      setLat,
      lon: state.lon,
      setLon,
      systemConfig: state.systemConfig,
      setSystemConfig,
      stage: state.stage,
      updateLifecycle,
      setStage,
      unsavedAnalysis: state.unsavedAnalysis,
      setUnsavedAnalysis,
      error: state.error,
      setError,
      locationName: state.locationName,
      setLocationName,
      saveStatus: state.saveStatus,
      setSaveStatus,
      prediction: state.prediction,
      setPrediction,
      financial: state.financial,
      setFinancial,
      explanation: state.explanation,
      setExplanation,
      monthly: state.monthly,
      setMonthly,
      geometry: state.geometry,
      setGeometry,
      dataProvenance: state.dataProvenance,
      setDataProvenance,
      annualAverages: state.annualAverages,
      setAnnualAverages,
      physicsSimulation: state.physicsSimulation,
      setPhysicsSimulation,
      mlVsPhysicsDelta: state.mlVsPhysicsDelta,
      setMlVsPhysicsDelta,
      activeDocuments: state.activeDocuments,
      setActiveDocuments,
      updateResults,
      resetResults,
    }),
    [
      state.lat,
      state.lon,
      state.systemConfig,
      state.stage,
      state.unsavedAnalysis,
      state.error,
      state.locationName,
      state.saveStatus,
      state.prediction,
      state.financial,
      state.explanation,
      state.monthly,
      state.geometry,
      state.dataProvenance,
      state.annualAverages,
      state.physicsSimulation,
      state.mlVsPhysicsDelta,
      state.activeDocuments,
      updateWorkspace,
      setLat,
      setLon,
      setSystemConfig,
      updateLifecycle,
      setStage,
      setUnsavedAnalysis,
      setError,
      setLocationName,
      setSaveStatus,
      setPrediction,
      setFinancial,
      setExplanation,
      setMonthly,
      setGeometry,
      setDataProvenance,
      setAnnualAverages,
      setPhysicsSimulation,
      setMlVsPhysicsDelta,
      setActiveDocuments,
      updateResults,
      resetResults,
    ],
  );

  return (
    <DashboardWorkspaceContext.Provider value={value}>{children}</DashboardWorkspaceContext.Provider>
  );
}

export function useDashboardWorkspace() {
  const context = useContext(DashboardWorkspaceContext);
  if (!context) {
    throw new Error("useDashboardWorkspace must be used within DashboardWorkspaceProvider");
  }
  return context;
}
