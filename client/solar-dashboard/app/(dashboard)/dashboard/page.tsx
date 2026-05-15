"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Chatbot } from "@/components/chatbot";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SetupView } from "@/components/dashboard/setup-view";
import { PipelineView } from "@/components/dashboard/pipeline-view";
import { ResultsView } from "@/components/dashboard/results-view";
import { streamPlan, analyze } from "@/lib/api";
import { useBackendStatusContext } from "@/lib/backend-status-context";
import { useDashboardWorkspace } from "@/lib/dashboard-workspace-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useStreamingAnalysis } from "@/lib/use-streaming-analysis";
import { createSavedRunFromAnalysis, useLocationsStore } from "@/lib/locations-store";
import type { AnalysisResult } from "@/types";

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

const PANEL_EFFICIENCY_MAP = {
  monocrystalline: 0.2,
  polycrystalline: 0.17,
  "thin-film": 0.11,
} as const;

const STAGE_LABELS: Record<string, string> = {
  idle: "Ready",
  location: "Data check",
  prediction: "Energy estimate",
  physics: "Engineering check",
  financial: "Cost & savings",
  explanation: "Explanation",
  complete: "Complete",
  error: "Error",
};

export default function DashboardPage() {
  const router = useRouter();
  const { markDisconnected } = useBackendStatusContext();
  const dashboardWorkspace = useDashboardWorkspace();
  const workspace = useWorkspace();
  const analysis = useStreamingAnalysis();
  const { createLocation, upsertLocation, attachRun, locations } = useLocationsStore();
  const [view, setView] = useState<"setup" | "pipeline" | "results">("setup");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [pipelineStage, setPipelineStage] = useState(analysis.state.stage);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [dismissDisclaimer, setDismissDisclaimer] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [hasSavedAnalysis, setHasSavedAnalysis] = useState(false);

  // Derived state
  const isLoading = analysis.state.stage !== "idle" && analysis.state.stage !== "complete" && analysis.state.stage !== "error";

  // Financial overrides
  const getFinancialOverrides = useCallback(() => ({
    region: workspace.state.systemConfig.region,
    system_capacity_kw: workspace.state.systemConfig.systemCapacityKw,
    panel_efficiency: PANEL_EFFICIENCY_MAP[workspace.state.systemConfig.panelTechnology],
    performance_ratio: workspace.state.systemConfig.performanceRatio,
    electricity_tariff_usd: workspace.state.systemConfig.electricityTariffUsd,
    installation_type: workspace.state.systemConfig.installationType,
    grid_connection: workspace.state.systemConfig.gridConnection,
    panel_technology: workspace.state.systemConfig.panelTechnology,
  }), [workspace.state.systemConfig]);

  useEffect(() => {
    if (analysis.state.stage !== "idle") {
      setPipelineStage(analysis.state.stage);
      return;
    }
    if (view === "setup") {
      setPipelineStage("idle");
    }
  }, [analysis.state.stage, view]);

  // Fallback POST /analyze handler
  const handleStreamFailure = useCallback(async () => {
    try {
      const result = await analyze({
        lat: workspace.state.lat,
        lon: workspace.state.lon,
        financial_overrides: getFinancialOverrides(),
      });

      if (!result) {
        analysis.setStreamError("Analysis returned no data");
        return;
      }

      // Update all results
      analysis.handleDataEvent("location", {
        monthly: result.monthly,
        data_provenance: result.data_provenance,
      });
      analysis.handleDataEvent("prediction", result.prediction);
      analysis.handleDataEvent("physics", result.physics_simulation);
      analysis.handleDataEvent("financial", result.financial);
      analysis.handleDataEvent("geometry", result.geometry);
      analysis.handleDataEvent("explanation", result.explanation);

      // Complete immediately
      analysis.completeAnalysis();
    } catch (err) {
      analysis.setStreamError((err as Error).message || "Analysis failed");
      markDisconnected();
    }
  }, [workspace.state.lat, workspace.state.lon, getFinancialOverrides, analysis, markDisconnected]);

  // Main analysis trigger
  const handleAnalyze = useCallback(() => {
    setView("pipeline");
    setSaveDialogOpen(false);
    setSaveName("");
    setHasSavedAnalysis(false);
    if (workspace.state.saveStatus) workspace.setSaveStatus(null);
    analysis.startAnalysis();

    const { cancel } = streamPlan(
      workspace.state.lat,
      workspace.state.lon,
      (event, data) => {
        // Stage events trigger watchdog rearm
        if (event === "stage") {
          analysis.armWatchdog(45_000, handleStreamFailure);
          analysis.handleStageEvent(
            data.stage as Parameters<typeof analysis.handleStageEvent>[0],
            Array.isArray(data.documents) ? data.documents : [],
          );
          return;
        }

        // Stream completion
        if (event === "done") {
          analysis.completeAnalysis();
          return;
        }

        // Stream error
        if (event === "error") {
          analysis.setStreamError(`Stream error: ${data?.message || "Unknown"}`);
          markDisconnected();
          return;
        }

        // Data events
        if (["location", "prediction", "physics", "financial", "geometry", "explanation"].includes(event)) {
          analysis.handleDataEvent(event, data);
          analysis.armWatchdog(45_000, handleStreamFailure);
        }
      },
      {
        model: "linear_regression",
        region: workspace.state.systemConfig.region,
        system_capacity_kw: workspace.state.systemConfig.systemCapacityKw,
        panel_efficiency: PANEL_EFFICIENCY_MAP[workspace.state.systemConfig.panelTechnology],
        performance_ratio: workspace.state.systemConfig.performanceRatio,
        electricity_tariff_usd: workspace.state.systemConfig.electricityTariffUsd,
        panel_technology: workspace.state.systemConfig.panelTechnology,
        installation_type: workspace.state.systemConfig.installationType,
      },
    );

    analysis.setCancelCallback(cancel);
  }, [workspace.state, analysis, handleStreamFailure, markDisconnected, workspace]);

  // Effective delta
  const effectiveDelta = analysis.state.mlVsPhysicsDelta ??
    (analysis.state.physicsSimulation?.status === "ok" &&
      typeof analysis.state.physicsSimulation.annual_energy_kwh === "number" &&
      analysis.state.financial
      ? {
        ml_annual_output_kwh: Number(analysis.state.financial.annual_output_kwh),
        physics_annual_output_kwh: Number(analysis.state.physicsSimulation.annual_energy_kwh),
        delta_kwh: Number(
          (Number(analysis.state.financial.annual_output_kwh) - Number(analysis.state.physicsSimulation.annual_energy_kwh)).toFixed(2),
        ),
        delta_pct:
          Number(analysis.state.physicsSimulation.annual_energy_kwh) > 0
            ? Number(
              (
                ((Number(analysis.state.financial.annual_output_kwh) -
                  Number(analysis.state.physicsSimulation.annual_energy_kwh)) /
                  Number(analysis.state.physicsSimulation.annual_energy_kwh)) *
                100
              ).toFixed(2),
            )
            : null,
      }
      : null);

  // Save analysis
  const hasResults = !!(
    analysis.state.prediction ||
    analysis.state.financial ||
    analysis.state.explanation ||
    analysis.state.monthly ||
    analysis.state.physicsSimulation
  );
  const canSaveAnalysis = !!(analysis.state.prediction && analysis.state.financial && analysis.state.explanation);
  const showEmptyState = view === "setup" && !hasResults && !isLoading;
  const canViewResults =
    view === "pipeline" &&
    hasResults &&
    (analysis.state.stage === "complete" || analysis.state.stage === "idle");
  const shouldGuardExit = view === "results" && hasResults && !hasSavedAnalysis;

  const handleSaveAnalysis = useCallback((name: string) => {
    if (!analysis.state.prediction || !analysis.state.financial || !analysis.state.explanation) {
      workspace.setSaveStatus("Complete an analysis before saving.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      workspace.setSaveStatus("Name is required.");
      return;
    }

    const resultToSave: AnalysisResult = {
      prediction: analysis.state.prediction,
      financial: analysis.state.financial,
      explanation: analysis.state.explanation,
      geometry: analysis.state.geometry ?? undefined,
      monthly: analysis.state.monthly ?? undefined,
      data_provenance: analysis.state.dataProvenance ?? undefined,
      physics_simulation: analysis.state.physicsSimulation ?? undefined,
      ml_vs_physics_delta: analysis.state.mlVsPhysicsDelta ?? undefined,
      location: { lat: workspace.state.lat, lon: workspace.state.lon },
    };

    const normalizedName = trimmedName.toLowerCase();
    const existing = locations.find(
      (item) =>
        item.name.toLowerCase() === normalizedName ||
        (Math.abs(item.coordinates.lat - workspace.state.lat) < 0.0001 &&
          Math.abs(item.coordinates.lon - workspace.state.lon) < 0.0001),
    );

    const run = createSavedRunFromAnalysis(resultToSave);

    if (existing) {
      upsertLocation({
        ...existing,
        name: trimmedName,
        coordinates: { lat: workspace.state.lat, lon: workspace.state.lon },
        systemConfig: workspace.state.systemConfig,
        latestRun: run,
        updatedAt: new Date().toISOString(),
      });
      workspace.setSaveStatus(`Updated ${trimmedName}.`);
    } else {
      const created = createLocation({
        name: trimmedName,
        coordinates: { lat: workspace.state.lat, lon: workspace.state.lon },
        systemConfig: workspace.state.systemConfig,
      });
      attachRun(created.id, run);
      workspace.setSaveStatus(`Saved as ${trimmedName}.`);
    }

    setSaveDialogOpen(false);
    setSaveName("");
    setHasSavedAnalysis(true);
  }, [analysis.state, workspace.state, workspace, locations, createLocation, upsertLocation, attachRun]);

  const handleSaveDialogChange = useCallback((nextOpen: boolean) => {
    setSaveDialogOpen(nextOpen);
    if (nextOpen) {
      setSaveName("");
      if (workspace.state.saveStatus) workspace.setSaveStatus(null);
    }
  }, [workspace]);

  const handleResetToSetup = useCallback(() => {
    analysis.resetAnalysis();
    setView("setup");
    setSaveDialogOpen(false);
    setSaveName("");
    setPendingNavigation(null);
    setHasSavedAnalysis(false);
    if (workspace.state.saveStatus) workspace.setSaveStatus(null);
  }, [analysis, workspace]);

  const handleRequestExit = useCallback((nextHref?: string) => {
    if (shouldGuardExit) {
      setPendingNavigation(nextHref ?? null);
      setShowExitConfirm(true);
      return;
    }

    if (nextHref) {
      router.push(nextHref);
      return;
    }

    handleResetToSetup();
  }, [shouldGuardExit, handleResetToSetup, router]);

  const handleViewResults = useCallback(() => {
    setView("results");
  }, []);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem("zenith:disclaimer-dismissed");
      if (!dismissed) setShowDisclaimer(true);
    } catch {
      setShowDisclaimer(true);
    }
  }, []);

  const handleCloseDisclaimer = useCallback(() => {
    if (dismissDisclaimer) {
      try {
        window.localStorage.setItem("zenith:disclaimer-dismissed", "true");
      } catch {
        // ignore storage issues
      }
    }
    setShowDisclaimer(false);
  }, [dismissDisclaimer]);

  const handleSaveNameChange = useCallback((nextValue: string) => {
    setSaveName(nextValue);
    if (workspace.state.saveStatus) workspace.setSaveStatus(null);
  }, [workspace]);

  const handleExitConfirmed = useCallback(() => {
    setShowExitConfirm(false);
    if (pendingNavigation) {
      const href = pendingNavigation;
      setPendingNavigation(null);
      router.push(href);
      return;
    }
    handleResetToSetup();
  }, [pendingNavigation, handleResetToSetup, router]);

  const handleOpenLocations = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!shouldGuardExit) {
      return;
    }
    event.preventDefault();
    setPendingNavigation("/locations");
    setShowExitConfirm(true);
  }, [shouldGuardExit]);

  useEffect(() => {
    if (dashboardWorkspace.unsavedAnalysis !== shouldGuardExit) {
      dashboardWorkspace.setUnsavedAnalysis(shouldGuardExit);
    }
  }, [dashboardWorkspace, shouldGuardExit]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldGuardExit) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldGuardExit]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!shouldGuardExit) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(`${url.pathname}${url.search}${url.hash}`);
      setShowExitConfirm(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [shouldGuardExit]);

  return (
    <div className="space-y-10 py-6">
      <Dialog open={showDisclaimer} onOpenChange={(nextOpen) => !nextOpen && handleCloseDisclaimer()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Project notice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              This is an exploratory project and is currently under development. Results are estimates and may not be fully accurate yet.
            </p>
            <p>
              We are improving the data sources, calculations, and explanations. Please verify important decisions with
              a qualified professional.
            </p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={dismissDisclaimer}
                onChange={(event) => setDismissDisclaimer(event.target.checked)}
              />
              Do not show again
            </label>
          </div>
          <DialogFooter>
            <Button className="bg-amber-400 text-foreground hover:bg-amber-500" onClick={handleCloseDisclaimer}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved analysis</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This analysis is not saved. If you leave now, you will lose the results.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
              Stay
            </Button>
            <Button
              className="bg-amber-400 text-foreground hover:bg-amber-500"
              onClick={handleExitConfirmed}
            >
              Leave anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardHeader
        title="Zenith"
        subtitle="Estimate output, costs, and payback with clear assumptions."
        lat={workspace.state.lat}
        lon={workspace.state.lon}
        capacityKw={workspace.state.systemConfig.systemCapacityKw}
      />

      {view === "setup" && (
        <SetupView
          lat={workspace.state.lat}
          lon={workspace.state.lon}
          isLoading={isLoading}
          systemConfig={workspace.state.systemConfig}
          annualAverages={analysis.state.annualAverages}
          stage={analysis.state.stage}
          showEmptyState={showEmptyState}
          onLatChange={workspace.setLat}
          onLonChange={workspace.setLon}
          onSystemConfigChange={workspace.setSystemConfig}
          onAnalyze={handleAnalyze}
          LocationMapComponent={LocationMap}
        />
      )}

      {view === "pipeline" && (
        <PipelineView
          stage={pipelineStage}
          documents={analysis.state.activeDocuments}
          errorMessage={analysis.state.error || undefined}
          canViewResults={canViewResults}
          onViewResults={handleViewResults}
        />
      )}

      {view === "results" && (
        <ResultsView
          analysis={analysis.state}
          locationsCount={locations.length}
          saveDialogOpen={saveDialogOpen}
          saveName={saveName}
          canSaveAnalysis={canSaveAnalysis}
          effectiveDelta={effectiveDelta}
          saveStatus={workspace.state.saveStatus}
          onSaveDialogChange={handleSaveDialogChange}
          onSaveNameChange={handleSaveNameChange}
          onSave={() => handleSaveAnalysis(saveName)}
          onAnalyzeNewLocation={() => handleRequestExit()}
          onOpenLocations={handleOpenLocations}
        />
      )}

      {analysis.state.error && view !== "pipeline" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {analysis.state.error}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground/70 pt-4">
        <p>Estimates use long-term climate averages and standard cost models. Site conditions still apply.</p>
      </div>

      {view === "results" && <Chatbot />}
    </div>
  );
}
