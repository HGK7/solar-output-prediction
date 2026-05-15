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

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  installationType: "rooftop",
  panelTechnology: "monocrystalline",
  gridConnection: "grid-tied",
  region: "global",
  systemCapacityKw: 5,
  electricityTariffUsd: 0.12,
  performanceRatio: 0.78,
};

type DashboardWorkspaceSnapshot = {
  lat: number;
  lon: number;
  systemConfig: SystemConfig;
  stage: LoadingStage;
  unsavedAnalysis: boolean;
  locationName: string;
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
  | { type: "hydrate"; payload: Partial<DashboardWorkspaceSnapshot> }
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

function isValidStage(stage: unknown): stage is LoadingStage {
  return (
    stage === "idle" ||
    stage === "location" ||
    stage === "prediction" ||
    stage === "physics" ||
    stage === "financial" ||
    stage === "explanation" ||
    stage === "complete" ||
    stage === "error"
  );
}

function dashboardWorkspaceReducer(
  state: DashboardWorkspaceState,
  action: DashboardWorkspaceAction,
): DashboardWorkspaceState {
  switch (action.type) {
    case "hydrate": {
      const nextStage = isValidStage(action.payload.stage) ? action.payload.stage : state.stage;
      return {
        ...state,
        ...action.payload,
        stage: nextStage,
      };
    }
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

  // Core dispatch wrappers with useCallback to maintain stable references
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

  // Simplified setters - call dispatch wrappers directly (no additional layers)
  const setLat = (next: number) => updateWorkspace({ lat: next });
  const setLon = (next: number) => updateWorkspace({ lon: next });
  const setSystemConfig = (next: SystemConfig) => updateWorkspace({ systemConfig: next });
  const setStage = (next: LoadingStage) => updateLifecycle({ stage: next });
  const setUnsavedAnalysis = (next: boolean) => updateWorkspace({ unsavedAnalysis: next });
  const setError = (next: string | null) => updateLifecycle({ error: next });
  const setLocationName = (next: string) => updateWorkspace({ locationName: next });
  const setSaveStatus = (next: string | null) => updateWorkspace({ saveStatus: next });
  const setPrediction = (next: PredictionResult | null) => updateResults({ prediction: next });
  const setFinancial = (next: FinancialSummary | null) => updateResults({ financial: next });
  const setExplanation = (next: ExplanationResponse | null) => updateResults({ explanation: next });
  const setMonthly = (next: Record<string, MonthlyData> | null) => updateResults({ monthly: next });
  const setGeometry = (next: GeometryResult | null) => updateResults({ geometry: next });
  const setDataProvenance = (next: DataProvenance | null) => updateResults({ dataProvenance: next });
  const setAnnualAverages = (next: Record<string, number> | null) => updateResults({ annualAverages: next });
  const setPhysicsSimulation = (next: PhysicsSimulationResult | null) => updateResults({ physicsSimulation: next });
  const setMlVsPhysicsDelta = (next: MLPhysicsDelta | null) => updateResults({ mlVsPhysicsDelta: next });
  const setActiveDocuments = (next: string[]) => updateLifecycle({ activeDocuments: next });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DASHBOARD_WORKSPACE_KEY);
      if (!raw) {
        hydratedRef.current = true;
        return;
      }

      try {
        const snapshot = JSON.parse(raw) as Partial<DashboardWorkspaceSnapshot>;
        dispatch({ type: "hydrate", payload: snapshot });
      } catch (err) {
        // Corrupted localStorage entry — clear it and continue with defaults.
        try {
          console.warn("Failed to parse dashboard workspace from localStorage, clearing corrupted key.", err);
          window.localStorage.removeItem(DASHBOARD_WORKSPACE_KEY);
        } catch { }
      }
    } catch (err) {
      // Unexpected environment error while reading localStorage — continue with defaults.
      console.warn("Error while accessing localStorage for dashboard workspace:", err);
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const snapshot: DashboardWorkspaceSnapshot = {
      ...state,
    };

    window.localStorage.setItem(DASHBOARD_WORKSPACE_KEY, JSON.stringify(snapshot));
  }, [state]);

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
    [state],
  );

  return <DashboardWorkspaceContext.Provider value={value}>{children}</DashboardWorkspaceContext.Provider>;
}

export function useDashboardWorkspace() {
  const context = useContext(DashboardWorkspaceContext);
  if (!context) {
    throw new Error("useDashboardWorkspace must be used within DashboardWorkspaceProvider");
  }
  return context;
}
