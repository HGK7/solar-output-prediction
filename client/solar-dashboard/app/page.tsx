"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sun, MapPin, Loader2 } from "lucide-react";
import { CoordinateInput } from "@/components/coordinate-input";
import { ManualParamsForm } from "@/components/manual-params-form";
import { PredictionCard } from "@/components/prediction-card";
import { FinancialCard } from "@/components/financial-card";
import { ExplanationPanel } from "@/components/explanation-panel";
import { FeatureChart } from "@/components/feature-chart";
import { OutputChart } from "@/components/output-chart";
import { Chatbot } from "@/components/chatbot";
import { streamPlan, analyze } from "@/lib/api";
import type {
  PredictionResult,
  FinancialSummary,
  ExplanationResponse,
  MonthlyData,
  GeometryResult,
  DataProvenance,
} from "@/types";

// Dynamic import for Leaflet map (no SSR)
const LocationMap = dynamic(
  () => import("@/components/location-map").then((m) => m.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-87.5 w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

type LoadingStage = "idle" | "location" | "prediction" | "financial" | "explanation" | "complete" | "error";

export default function DashboardPage() {
  // Location state
  const [lat, setLat] = useState(27.5);  // Bhadla Solar Park defaults
  const [lon, setLon] = useState(71.6);

  // Analysis results
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [monthly, setMonthly] = useState<Record<string, MonthlyData> | null>(null);
  const [geometry, setGeometry] = useState<GeometryResult | null>(null);
  const [dataProvenance, setDataProvenance] = useState<DataProvenance | null>(null);

  // UI state
  const [stage, setStage] = useState<LoadingStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const isLoading = stage !== "idle" && stage !== "complete" && stage !== "error";

  // ── Streamed analysis (primary path) ──
  const handleAnalyze = useCallback(() => {
    // Reset state
    setPrediction(null);
    setFinancial(null);
    setExplanation(null);
    setMonthly(null);
    setGeometry(null);
    setDataProvenance(null);
    setError(null);
    setStage("location");

    const { cancel } = streamPlan(lat, lon, (event, data) => {
      switch (event) {
        case "stage":
          setStage(data.stage as LoadingStage);
          break;
        case "location":
          setMonthly(data.monthly as Record<string, MonthlyData>);
          if (data.data_provenance) {
            setDataProvenance(data.data_provenance as unknown as DataProvenance);
          }
          break;
        case "prediction":
          setPrediction(data as unknown as PredictionResult);
          break;
        case "financial":
          setFinancial(data as unknown as FinancialSummary);
          break;
        case "geometry":
          setGeometry(data as unknown as GeometryResult);
          break;
        case "explanation":
          setExplanation(data as unknown as ExplanationResponse);
          break;
        case "done":
          setStage("complete");
          break;
        case "error":
          setError(data.error as string);
          setStage("error");
          break;
      }
    });

    cancelRef.current = cancel;
  }, [lat, lon]);

  // ── Manual features analysis (non-streaming fallback) ──
  const handleManualAnalyze = useCallback(async (features: Record<string, number>) => {
    setPrediction(null);
    setFinancial(null);
    setExplanation(null);
    setMonthly(null);
    setGeometry(null);
    setDataProvenance(null);
    setError(null);
    setStage("prediction");

    try {
      const result = await analyze({ features });
      setPrediction(result.prediction);
      setFinancial(result.financial);
      setExplanation(result.explanation);
      if (result.monthly) setMonthly(result.monthly);
      if (result.geometry) setGeometry(result.geometry);
      if (result.data_provenance) setDataProvenance(result.data_provenance);
      setStage("complete");
    } catch (err) {
      setError((err as Error).message);
      setStage("error");
    }
  }, []);

  const hasResults = prediction || financial || explanation || monthly;

  return (
    <div className="min-h-screen bg-linear-to-br from-yellow-50 via-sky-50 to-white">
      {/* ── Hero / Header ── */}
      <header className="py-10 px-6 md:px-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Sun className="h-8 w-8 text-amber-400" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Solar Intelligence Dashboard
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto text-base">
          AI-powered solar energy analysis — predict output, evaluate ROI, and
          get expert recommendations for any location worldwide.
        </p>
      </header>

      <main className="px-6 md:px-12 pb-20 max-w-7xl mx-auto space-y-10">
        {/* ── Section 1: Location Input ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-400" />
            Select Location
          </h2>
          <p className="text-sm text-muted-foreground">
            Search for a city to zoom in, then click the map or drag the pin
            to pinpoint your location. You can also enter coordinates manually.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <LocationMap lat={lat} lon={lon} onLocationChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <CoordinateInput
                lat={lat}
                lon={lon}
                onLatChange={setLat}
                onLonChange={setLon}
              />

              <Button
                onClick={handleAnalyze}
                disabled={isLoading}
                size="lg"
                className="w-full bg-amber-400 hover:bg-amber-500 text-foreground font-semibold text-base shadow-md shadow-amber-200/40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {stage === "location" && "Fetching location data…"}
                    {stage === "prediction" && "Running prediction…"}
                    {stage === "financial" && "Calculating financials…"}
                    {stage === "explanation" && "Generating explanation…"}
                  </>
                ) : (
                  <>
                    <Sun className="h-5 w-5 mr-2" />
                    Analyze Solar Potential
                  </>
                )}
              </Button>

              <ManualParamsForm
                onSubmit={handleManualAnalyze}
                isLoading={isLoading}
              />
            </div>
          </div>
        </section>

        {/* ── Error Display ── */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Section 2: Results ── */}
        {(hasResults || isLoading) && (
          <>
            <Separator className="bg-white/40" />

            <section className="space-y-6">
              {/* Top row: prediction + financial cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PredictionCard
                  prediction={prediction}
                  isLoading={stage === "location" || stage === "prediction"}
                  dataProvenance={dataProvenance}
                />
                <FinancialCard
                  financial={financial}
                  geometry={geometry}
                  isLoading={stage === "location" || stage === "prediction" || stage === "financial"}
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OutputChart
                  monthly={monthly}
                  isLoading={stage === "location"}
                />
                <FeatureChart
                  featureImportance={prediction?.feature_importance ?? null}
                  isLoading={stage === "location" || stage === "prediction"}
                />
              </div>

              {/* Explanation */}
              <ExplanationPanel
                explanation={explanation}
                isLoading={
                  stage === "location" ||
                  stage === "prediction" ||
                  stage === "financial" ||
                  stage === "explanation"
                }
              />
            </section>
          </>
        )}

        {/* ── Disclaimer ── */}
        <div className="text-center text-xs text-muted-foreground/60 pt-6">
          <p>
            Estimates are based on NASA POWER climatological data and
            standardized cost models. Actual results will vary. Consult a
            certified solar installer for project-specific guidance.
          </p>
        </div>
      </main>

      {/* ── Floating Chatbot ── */}
      <Chatbot />
    </div>
  );
}
