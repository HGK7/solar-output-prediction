"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, MapPin, Loader2, ChartNoAxesColumn } from "lucide-react";
import { CoordinateInput } from "@/components/coordinate-input";
import { PredictionCard } from "@/components/prediction-card";
import { FinancialCard } from "@/components/financial-card";
import { ExplanationPanel } from "@/components/explanation-panel";
import { OutputChart } from "@/components/output-chart";
import { SystemConfigPanel, type SystemConfig } from "@/components/system-config-panel";
import { Chatbot } from "@/components/chatbot";
import { streamPlan, analyze } from "@/lib/api";
import { useBackendStatusContext } from "@/lib/backend-status-context";
import type {
  PredictionResult,
  FinancialSummary,
  ExplanationResponse,
  MonthlyData,
  GeometryResult,
  DataProvenance,
} from "@/types";

const LocationMap = dynamic(
  () => import("@/components/location-map").then((m) => m.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-87.5 w-full rounded-xl border border-white/40 bg-white/50 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

type LoadingStage =
  | "idle"
  | "location"
  | "prediction"
  | "financial"
  | "explanation"
  | "complete"
  | "error";

const PANEL_EFFICIENCY_MAP = {
  monocrystalline: 0.2,
  polycrystalline: 0.17,
  "thin-film": 0.11,
} as const;

const REQUIRED_STREAM_EVENTS = [
  "location",
  "prediction",
  "financial",
  "geometry",
  "explanation",
] as const;

export default function DashboardPage() {
  const { markDisconnected } = useBackendStatusContext();

  const [lat, setLat] = useState(27.5);
  const [lon, setLon] = useState(71.6);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [monthly, setMonthly] = useState<Record<string, MonthlyData> | null>(null);
  const [geometry, setGeometry] = useState<GeometryResult | null>(null);
  const [dataProvenance, setDataProvenance] = useState<DataProvenance | null>(null);
  const [annualAverages, setAnnualAverages] = useState<Record<string, number> | null>(null);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    installationType: "rooftop",
    panelTechnology: "monocrystalline",
    gridConnection: "grid-tied",
    region: "global",
    systemCapacityKw: 5,
    electricityTariffUsd: 0.12,
    performanceRatio: 0.78,
  });

  const [stage, setStage] = useState<LoadingStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const streamWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receivedEventsRef = useRef<Set<string>>(new Set());
  const fallbackInProgressRef = useRef(false);

  const isLoading = stage !== "idle" && stage !== "complete" && stage !== "error";

  const clearWatchdog = useCallback(() => {
    if (streamWatchdogRef.current) {
      clearTimeout(streamWatchdogRef.current);
      streamWatchdogRef.current = null;
    }
  }, []);

  const resetResultState = useCallback(() => {
    setPrediction(null);
    setFinancial(null);
    setExplanation(null);
    setMonthly(null);
    setGeometry(null);
    setDataProvenance(null);
    setAnnualAverages(null);
    setError(null);
  }, []);

  const buildFinancialOverrides = useCallback(
    () => ({
      region: systemConfig.region,
      system_capacity_kw: systemConfig.systemCapacityKw,
      panel_efficiency: PANEL_EFFICIENCY_MAP[systemConfig.panelTechnology],
      performance_ratio: systemConfig.performanceRatio,
      electricity_tariff_usd: systemConfig.electricityTariffUsd,
      installation_type: systemConfig.installationType,
      grid_connection: systemConfig.gridConnection,
      panel_technology: systemConfig.panelTechnology,
    }),
    [systemConfig],
  );

  const recoverWithAnalyze = useCallback(
    async (reason: string) => {
      if (fallbackInProgressRef.current) return;
      fallbackInProgressRef.current = true;
      clearWatchdog();

      try {
        const result = await analyze({
          lat,
          lon,
          financial_overrides: buildFinancialOverrides(),
        });

        setPrediction(result.prediction);
        setFinancial(result.financial);
        setExplanation(result.explanation);
        if (result.monthly) setMonthly(result.monthly);
        if (result.geometry) setGeometry(result.geometry);
        if (result.data_provenance) setDataProvenance(result.data_provenance);
        if ((result as { annual_averages?: Record<string, number> }).annual_averages) {
          setAnnualAverages(
            (result as { annual_averages?: Record<string, number> }).annual_averages ?? null,
          );
        }
        setStage("complete");
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setStage("error");
        markDisconnected();
      } finally {
        fallbackInProgressRef.current = false;
      }
    },
    [buildFinancialOverrides, clearWatchdog, lat, lon, markDisconnected],
  );

  const armWatchdog = useCallback(() => {
    clearWatchdog();
    streamWatchdogRef.current = setTimeout(() => {
      void recoverWithAnalyze("Stream timeout (45s without events)");
    }, 45_000);
  }, [clearWatchdog, recoverWithAnalyze]);

  const handleAnalyze = useCallback(() => {
    resetResultState();
    setStage("location");
    receivedEventsRef.current = new Set();
    fallbackInProgressRef.current = false;
    armWatchdog();

    const { cancel } = streamPlan(
      lat,
      lon,
      (event, data) => {
        armWatchdog();

        switch (event) {
          case "stage":
            setStage(data.stage as LoadingStage);
            break;
          case "location":
            receivedEventsRef.current.add("location");
            setMonthly(data.monthly as Record<string, MonthlyData>);
            if (data.annual_averages && typeof data.annual_averages === "object") {
              setAnnualAverages(data.annual_averages as Record<string, number>);
            }
            if (data.data_provenance) {
              setDataProvenance(data.data_provenance as DataProvenance);
            }
            break;
          case "prediction":
            receivedEventsRef.current.add("prediction");
            setPrediction(data as unknown as PredictionResult);
            break;
          case "financial":
            receivedEventsRef.current.add("financial");
            setFinancial(data as unknown as FinancialSummary);
            break;
          case "geometry":
            receivedEventsRef.current.add("geometry");
            setGeometry(data as unknown as GeometryResult);
            break;
          case "explanation":
            receivedEventsRef.current.add("explanation");
            setExplanation(data as unknown as ExplanationResponse);
            break;
          case "done":
            clearWatchdog();
            if (
              REQUIRED_STREAM_EVENTS.every((requiredEvent) =>
                receivedEventsRef.current.has(requiredEvent),
              )
            ) {
              setStage("complete");
            } else {
              void recoverWithAnalyze("Stream completed with missing sections");
            }
            break;
          case "error":
            clearWatchdog();
            markDisconnected();
            void recoverWithAnalyze((data.error as string) ?? "Stream error");
            break;
        }
      },
      {
        model: "linear_regression",
        region: systemConfig.region,
        system_capacity_kw: systemConfig.systemCapacityKw,
        panel_efficiency: PANEL_EFFICIENCY_MAP[systemConfig.panelTechnology],
        performance_ratio: systemConfig.performanceRatio,
        electricity_tariff_usd: systemConfig.electricityTariffUsd,
      },
    );

    cancelRef.current = cancel;
  }, [
    armWatchdog,
    clearWatchdog,
    lat,
    lon,
    recoverWithAnalyze,
    resetResultState,
    systemConfig.electricityTariffUsd,
    systemConfig.panelTechnology,
    systemConfig.performanceRatio,
    systemConfig.region,
    systemConfig.systemCapacityKw,
  ]);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
      clearWatchdog();
    };
  }, [clearWatchdog]);

  const hasResults = prediction || financial || explanation || monthly;

  return (
    <div className="space-y-8 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Analyze solar potential, financial return, and AI-backed explanation.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-sky-400" />
          Select Location
        </h2>
        <p className="text-sm text-muted-foreground">
          Search for a city to zoom in, then click the map or drag the pin to pinpoint your location.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LocationMap
              lat={lat}
              lon={lon}
              onLocationChange={(newLat, newLon) => {
                setLat(newLat);
                setLon(newLon);
              }}
            />
          </div>

          <div className="space-y-4">
            <CoordinateInput lat={lat} lon={lon} onLatChange={setLat} onLonChange={setLon} />

            <SystemConfigPanel value={systemConfig} onChange={setSystemConfig} disabled={isLoading} />

            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChartNoAxesColumn className="h-4 w-4 text-sky-400" />
                  Location Average Solar Inputs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {stage === "location" && !annualAverages ? (
                  <>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </>
                ) : annualAverages ? (
                  <div className="space-y-1 text-muted-foreground">
                    <p>
                      Temperature: <span className="font-medium text-foreground">{annualAverages.Temperature?.toFixed(2)} °C</span>
                    </p>
                    <p>
                      Humidity: <span className="font-medium text-foreground">{annualAverages.Humidity?.toFixed(2)} %</span>
                    </p>
                    <p>
                      Wind Speed: <span className="font-medium text-foreground">{annualAverages["Wind Speed"]?.toFixed(2)} m/s</span>
                    </p>
                    <p>
                      Clear Sky Irradiance: <span className="font-medium text-foreground">{annualAverages["Clear Sky Irradiance"]?.toFixed(2)} kWh/m²/day</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Run analysis to load NASA climatological averages for this location.</p>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleAnalyze}
              disabled={isLoading}
              size="lg"
              className="w-full bg-amber-400 text-foreground shadow-md shadow-amber-200/40 hover:bg-amber-500"
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
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {(hasResults || isLoading) && (
        <>
          <Separator className="bg-white/40" />

          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PredictionCard
                prediction={prediction}
                isLoading={stage === "location" || stage === "prediction"}
                dataProvenance={dataProvenance}
              />
              <FinancialCard
                financial={financial}
                geometry={geometry}
                isLoading={
                  stage === "location" || stage === "prediction" || stage === "financial"
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OutputChart monthly={monthly} isLoading={stage === "location"} />
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Monthly Output Insight</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Seasonal output trends help size system capacity and forecast expected savings.
                  </p>
                  <p>
                    Use this monthly profile to compare low-yield and peak-yield periods before
                    finalizing installation and storage decisions.
                  </p>
                </CardContent>
              </Card>
            </div>

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

      <div className="text-center text-xs text-muted-foreground/60 pt-4">
        <p>
          Estimates are based on NASA POWER climatological data and standardized cost models.
          Actual results vary by site and installation constraints.
        </p>
      </div>

      <Chatbot />
    </div>
  );
}
