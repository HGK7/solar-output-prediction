"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AnalysisResult,
  DataProvenance,
  ExplanationResponse,
  FinancialSummary,
  GeometryResult,
  MLPhysicsDelta,
  MonthlyData,
  PhysicsSimulationResult,
  PredictionResult,
} from "@/types";

export type StreamingStage =
  | "idle"
  | "location"
  | "prediction"
  | "physics"
  | "financial"
  | "explanation"
  | "complete"
  | "error";

export interface StreamingState {
  stage: StreamingStage;
  error: string | null;
  activeDocuments: string[];
  prediction: PredictionResult | null;
  financial: FinancialSummary | null;
  explanation: ExplanationResponse | null;
  monthly: Record<string, MonthlyData> | null;
  geometry: GeometryResult | null;
  dataProvenance: DataProvenance | null;
  annualAverages: Record<string, number> | null;
  physicsSimulation: PhysicsSimulationResult | null;
  mlVsPhysicsDelta: MLPhysicsDelta | null;
}

const INITIAL_STATE: StreamingState = {
  stage: "idle",
  error: null,
  activeDocuments: [],
  prediction: null,
  financial: null,
  explanation: null,
  monthly: null,
  geometry: null,
  dataProvenance: null,
  annualAverages: null,
  physicsSimulation: null,
  mlVsPhysicsDelta: null,
};

/**
 * Custom hook for managing streaming analysis state.
 * Handles SSE events, timeouts, and state transitions atomically.
 */
export function useStreamingAnalysis() {
  const [state, setState] = useState<StreamingState>(INITIAL_STATE);

  // Refs for tracking stream state (not re-render triggers)
  const mountedRef = useRef(true);
  const cancelRef = useRef<(() => void) | null>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const receivedEventsRef = useRef<Set<string>>(new Set());
  const isStreamingRef = useRef(false);

  // Set mounted flag
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Atomic state update that ensures consistency
  const updateState = useCallback((updates: Partial<StreamingState>) => {
    if (!mountedRef.current) return;
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Reset all analysis data
  const resetAnalysis = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    if (cancelRef.current) cancelRef.current();
    cancelRef.current = null;
    receivedEventsRef.current.clear();
    isStreamingRef.current = false;
    updateState(INITIAL_STATE);
  }, [updateState]);

  // Start analysis - prepare state
  const startAnalysis = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    cancelRef.current = null;
    receivedEventsRef.current.clear();
    isStreamingRef.current = true;

    updateState({
      stage: "location",
      error: null,
      activeDocuments: [],
      prediction: null,
      financial: null,
      explanation: null,
      monthly: null,
      geometry: null,
      dataProvenance: null,
      annualAverages: null,
      physicsSimulation: null,
      mlVsPhysicsDelta: null,
    });
  }, [updateState]);

  // Handle SSE stage event
  const handleStageEvent = useCallback(
    (stage: StreamingStage, documents: string[]) => {
      if (!mountedRef.current || !isStreamingRef.current) return;
      updateState({ stage, activeDocuments: documents });
    },
    [updateState]
  );

  // Handle SSE data event (generic results)
  const handleDataEvent = useCallback(
    (eventType: string, data: unknown) => {
      if (!mountedRef.current || !isStreamingRef.current) return;

      receivedEventsRef.current.add(eventType);

      const updates: Partial<StreamingState> = {};

      switch (eventType) {
        case "location": {
          const locationData = data as any;
          updates.monthly = locationData.monthly;
          if (locationData.annual_averages) {
            updates.annualAverages = locationData.annual_averages;
          }
          if (locationData.data_provenance) {
            updates.dataProvenance = locationData.data_provenance;
          }
          break;
        }
        case "prediction":
          updates.prediction = data as PredictionResult;
          break;
        case "physics":
          updates.physicsSimulation = data as PhysicsSimulationResult;
          break;
        case "financial":
          updates.financial = data as FinancialSummary;
          break;
        case "geometry":
          updates.geometry = data as GeometryResult;
          break;
        case "explanation":
          updates.explanation = data as ExplanationResponse;
          break;
      }

      if (Object.keys(updates).length > 0) {
        updateState(updates);
      }
    },
    [updateState]
  );

  // Mark streaming complete
  const completeAnalysis = useCallback(() => {
    if (!mountedRef.current) return;
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    isStreamingRef.current = false;

    // Transition: complete -> idle after grace period.
    // Never keep the UI in a loading stage when the stream has ended.
    const requiredEvents = ["location", "prediction", "physics", "financial", "geometry", "explanation"];
    const missingEvents = requiredEvents.filter((e) => !receivedEventsRef.current.has(e));

    updateState({
      stage: "complete",
      error: missingEvents.length > 0 ? `Missing events: ${missingEvents.join(", ")}` : null,
    });

    setTimeout(() => {
      if (mountedRef.current) {
        updateState({ stage: "idle" });
      }
    }, 1200);
  }, [updateState]);

  // Set stream error
  const setStreamError = useCallback(
    (error: string) => {
      if (!mountedRef.current) return;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (cancelRef.current) cancelRef.current();
      isStreamingRef.current = false;
      updateState({ stage: "error", error });
    },
    [updateState]
  );

  // Arm watchdog timer
  const armWatchdog = useCallback(
    (timeoutMs: number, onTimeout: () => void) => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        if (mountedRef.current && isStreamingRef.current) {
          onTimeout();
        }
      }, timeoutMs);
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (cancelRef.current) cancelRef.current();
    };
  }, []);

  return {
    // State
    state,

    // Lifecycle
    startAnalysis,
    resetAnalysis,

    // Event handlers
    handleStageEvent,
    handleDataEvent,
    completeAnalysis,
    setStreamError,

    // Utilities
    armWatchdog,
    setCancelCallback: (fn: () => void) => {
      cancelRef.current = fn;
    },
    isStreaming: () => isStreamingRef.current,
  };
}
