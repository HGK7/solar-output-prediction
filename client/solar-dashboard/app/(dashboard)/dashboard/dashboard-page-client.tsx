"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/bento";
import { PlannerWorkspace } from "@/components/dashboard/planner-workspace";
import {
  OwnKeyDialog,
  shouldPromptForOwnKey,
} from "@/components/dashboard/own-key-dialog";
import { useShellActions } from "@/lib/shell-actions-context";
import { streamPlan } from "@/lib/api";
import { plannerInputIssue } from "@/lib/planner-input-rules";
import { useBackendStatusContext } from "@/lib/backend-status-context";
import { useDashboardWorkspace } from "@/lib/dashboard-workspace-context";
import { consumeReanalysisIntent } from "@/lib/reanalysis-intent";
import { useWorkspace } from "@/lib/workspace-context";
import { useStreamingAnalysis } from "@/lib/use-streaming-analysis";
import { createSavedRunFromAnalysis, useLocationsStore } from "@/lib/locations-store";
import {
  runContextSummary,
  useZenithPreferences,
} from "@/context/zenith-preferences-context";
import type { SystemConfig } from "@/components/system-config-panel";
import type { AnalysisResult } from "@/types";

const PANEL_EFFICIENCY_MAP = {
  monocrystalline: 0.2,
  polycrystalline: 0.17,
  "thin-film": 0.11,
} as const;

const STAGE_LABEL: Record<string, string> = {
  location: "Getting NASA climate data for your pin…",
  prediction: "Estimating daily sunlight…",
  physics: "Cross-checking output with an engineering model…",
  financial: "Calculating costs, subsidy, and savings…",
  explanation: "Writing the explanation…",
  complete: "Analysis complete",
  error: "Analysis failed",
};

export default function DashboardPage() {
  const router = useRouter();
  const { register, setBreadcrumb } = useShellActions();
  const { status: backendStatus, markConnected, markDisconnected } =
    useBackendStatusContext();
  const dashboardWorkspace = useDashboardWorkspace();
  const workspace = useWorkspace();
  const analysis = useStreamingAnalysis();
  const { createLocation, upsertLocation, attachRun, locations } =
    useLocationsStore();
  const prefs = useZenithPreferences();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [ownKeyPromptOpen, setOwnKeyPromptOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [hasSavedAnalysis, setHasSavedAnalysis] = useState(false);
  const [locationLocked, setLocationLocked] = useState(false);
  const [reanalysisLocationName, setReanalysisLocationName] = useState<string | null>(
    null,
  );
  const [reanalysisLocationId, setReanalysisLocationId] = useState<string | null>(null);
  const [reanalysisBaselineConfig, setReanalysisBaselineConfig] =
    useState<SystemConfig | null>(null);

  const isLoading =
    analysis.state.stage !== "idle" &&
    analysis.state.stage !== "complete" &&
    analysis.state.stage !== "error";
  const apiOffline = backendStatus === "unreachable" || backendStatus === "checking";

  const buildSystemConfigFromPrefs = useCallback((): SystemConfig => {
    const capacityKw =
      prefs.setupMode === "guided"
        ? prefs.liveCalc.recommendedCapacityKw
        : prefs.systemCapacityKw;

    return {
      installationType: prefs.installationType,
      panelTechnology: prefs.panelTechnology,
      gridConnection: prefs.gridConnection,
      region: prefs.region,
      systemCapacityKw: capacityKw,
      electricityTariffUsd: prefs.tariffUsd,
      performanceRatio: prefs.performanceRatio,
      model: prefs.estimationModel,
      batteryCapacityKwh:
        prefs.batteryCapacityKwh > 0 ? prefs.batteryCapacityKwh : undefined,
      includeIncentives: prefs.includeIncentives,
      monthlyBillUsd: prefs.monthlyBillUsd,
      monthlyConsumptionKwh: prefs.liveCalc.monthlyKwhConsumption,
      availableRoofAreaM2: prefs.availableRoofAreaM2,
      planningProfile: {
        scale: prefs.planningScale,
        jurisdiction: prefs.region,
        goal: prefs.goal,
      },
    };
  }, [prefs]);

  const syncPrefsToWorkspace = useCallback(() => {
    const nextConfig = buildSystemConfigFromPrefs();
    flushSync(() => {
      workspace.setLat(prefs.pinCoords.lat);
      workspace.setLon(prefs.pinCoords.lon);
      const isSamplePin =
        prefs.selectedSiteId === prefs.activeSite.id &&
        Math.abs(prefs.pinCoords.lat - prefs.activeSite.lat) < 0.05 &&
        Math.abs(prefs.pinCoords.lon - prefs.activeSite.lon) < 0.05;
      workspace.setLocationName(
        isSamplePin ? prefs.activeSite.name : locationLocked ? workspace.state.locationName : "",
      );
      if (!locationLocked) {
        workspace.setSystemConfig(nextConfig);
      } else {
        workspace.setSystemConfig({
          ...nextConfig,
          // Keep capacity/engineering edits during reanalysis; coords stay locked.
        });
      }
      if (prefs.setupMode === "guided") {
        prefs.setSystemCapacityKw(nextConfig.systemCapacityKw);
      }
    });
    return nextConfig;
  }, [buildSystemConfigFromPrefs, workspace, prefs, locationLocked]);

  useEffect(() => {
    dashboardWorkspace.setStage(analysis.state.stage);
  }, [analysis.state.stage, dashboardWorkspace]);

  useEffect(() => {
    if (locationLocked) return;
    workspace.setLat(prefs.pinCoords.lat);
    workspace.setLon(prefs.pinCoords.lon);
  }, [prefs.pinCoords.lat, prefs.pinCoords.lon, locationLocked, workspace]);

  const runFinancial = analysis.state.financial;
  const runPrediction = analysis.state.prediction;
  const { setAssistantSiteContext } = prefs;
  useEffect(() => {
    if (!runFinancial || !runPrediction) return;
    const { lat, lon, locationName, systemConfig } = workspace.state;
    if (lat === null || lon === null) return;
    const name =
      locationName ||
      `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
    setAssistantSiteContext({
      label: `${name} · latest planner run`,
      summary: runContextSummary({
        name,
        lat,
        lon,
        capacityKw: systemConfig.systemCapacityKw,
        gridConnection: systemConfig.gridConnection,
        region: systemConfig.region,
        prediction: runPrediction.prediction,
        annualOutputKwh: runFinancial.annual_output_kwh,
        paybackYears: runFinancial.simple_payback_years,
        netCostUsd: runFinancial.net_system_cost_usd ?? runFinancial.total_system_cost_usd,
      }),
    });
    // Attach once per new result, so detaching in the Solar Guide is not undone by later input edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runFinancial, runPrediction, setAssistantSiteContext]);

  const analysisStateRef = useRef(analysis.state);
  analysisStateRef.current = analysis.state;

  const handleStreamFailure = useCallback(() => {
    const snap = analysisStateRef.current;
    if (snap.prediction && snap.financial) {
      analysis.completeAnalysis();
      return;
    }
    analysis.setStreamError(
      "Analysis timed out before results arrived. Run it again.",
    );
  }, [analysis]);

  const handleAnalyze = useCallback(() => {
    if (apiOffline) {
      analysis.setStreamError("API offline. Analysis is unavailable.");
      return;
    }
    if (!prefs.locationConfirmed && !locationLocked) {
      prefs.setWorkspaceStep(1);
      analysis.setStreamError("Pin and confirm a location on the map before running analysis.");
      return;
    }

    const cfg = syncPrefsToWorkspace();
    prefs.setWorkspaceStep(3);
    prefs.setResultsTab("financials");
    setSaveDialogOpen(false);
    setSaveName("");
    setHasSavedAnalysis(false);
    if (workspace.state.saveStatus) workspace.setSaveStatus(null);
    analysis.startAnalysis();

    const { cancel } = streamPlan(
      prefs.pinCoords.lat,
      prefs.pinCoords.lon,
      (event, data) => {
        if (event === "stage") {
          markConnected();
          analysis.armWatchdog(75_000, handleStreamFailure);
          analysis.handleStageEvent(
            data.stage as Parameters<typeof analysis.handleStageEvent>[0],
            Array.isArray(data.documents) ? data.documents : [],
          );
          return;
        }

        if (event === "done") {
          markConnected();
          analysis.completeAnalysis();
          return;
        }

        if (event === "error") {
          analysis.setStreamError(
            (data?.error as string) ||
              (data?.message as string) ||
              "The analysis stopped unexpectedly. Please try again.",
          );
          markDisconnected();
          return;
        }

        if (
          [
            "location",
            "prediction",
            "physics",
            "financial",
            "geometry",
            "explanation",
          ].includes(event)
        ) {
          analysis.handleDataEvent(event, data);
          analysis.armWatchdog(75_000, handleStreamFailure);
        }
      },
      {
        model: cfg.model ?? "hist_gradient_boosting",
        region: cfg.region,
        system_capacity_kw: cfg.systemCapacityKw,
        panel_efficiency: PANEL_EFFICIENCY_MAP[cfg.panelTechnology],
        performance_ratio: cfg.performanceRatio,
        electricity_tariff_usd: cfg.electricityTariffUsd,
        panel_technology: cfg.panelTechnology,
        installation_type: cfg.installationType,
        grid_connection: cfg.gridConnection,
        battery_capacity_kwh: cfg.batteryCapacityKwh,
        include_incentives: cfg.includeIncentives ?? true,
        monthly_bill_usd: cfg.monthlyBillUsd,
        monthly_consumption_kwh: cfg.monthlyConsumptionKwh,
        available_roof_area_m2: cfg.availableRoofAreaM2,
        planning_scale: cfg.planningProfile?.scale ?? "homeowner",
      },
    );

    analysis.setCancelCallback(cancel);
  }, [
    apiOffline,
    locationLocked,
    syncPrefsToWorkspace,
    prefs,
    workspace,
    analysis,
    handleStreamFailure,
    markConnected,
  ]);

  useEffect(() => {
    const intent = consumeReanalysisIntent();
    if (!intent) return;
    setLocationLocked(true);
    setReanalysisLocationName(intent.locationName);
    setReanalysisLocationId(intent.locationId);
    setReanalysisBaselineConfig(intent.systemConfig);
    workspace.setLat(intent.lat);
    workspace.setLon(intent.lon);
    workspace.setLocationName(intent.locationName);
    workspace.setSystemConfig(intent.systemConfig);
    prefs.setPinCoords({ lat: intent.lat, lon: intent.lon });
    prefs.setWorkspaceStep(2);
    prefs.setSetupMode("engineering");
    if (intent.systemConfig.systemCapacityKw != null) {
      prefs.setSystemCapacityKw(intent.systemConfig.systemCapacityKw);
    }
    if (workspace.state.saveStatus) workspace.setSaveStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  const reanalysisPreviousRun = useMemo(() => {
    if (!reanalysisLocationId) return null;
    const loc = locations.find((item) => item.id === reanalysisLocationId);
    return loc?.latestRun ?? null;
  }, [reanalysisLocationId, locations]);

  void reanalysisBaselineConfig;
  void reanalysisPreviousRun;

  const canSaveAnalysis = !!(
    analysis.state.prediction && analysis.state.financial
  );
  const shouldGuardExit =
    prefs.workspaceStep === 3 && canSaveAnalysis && !hasSavedAnalysis;

  const handleSaveAnalysis = useCallback(
    (name: string) => {
      if (!analysis.state.prediction || !analysis.state.financial) {
        workspace.setSaveStatus("Complete an analysis before saving.");
        return;
      }

      const trimmed = name.trim();
      if (!trimmed) {
        workspace.setSaveStatus("Enter a location name.");
        return;
      }

      const resultToSave: AnalysisResult = {
        prediction: analysis.state.prediction,
        financial: analysis.state.financial,
        explanation: analysis.state.explanation ?? {
          explanation_summary: "Explanation was not available for this run.",
          key_drivers: [],
          physical_interpretation: "",
          uncertainty_notes: "",
          risk_factors: [],
          confidence_assessment: "low",
          financial_insight: null,
        },
        geometry: analysis.state.geometry ?? undefined,
        monthly: analysis.state.monthly ?? undefined,
        data_provenance: analysis.state.dataProvenance ?? undefined,
        physics_simulation: analysis.state.physicsSimulation ?? undefined,
        ml_vs_physics_delta: analysis.state.mlVsPhysicsDelta ?? undefined,
        location: { lat: workspace.state.lat, lon: workspace.state.lon },
      };

      const run = createSavedRunFromAnalysis(
        resultToSave,
        workspace.state.systemConfig,
      );
      const location = createLocation({
        name: trimmed,
        coordinates: { lat: workspace.state.lat, lon: workspace.state.lon },
        systemConfig: workspace.state.systemConfig,
      });
      attachRun(location.id, run);
      workspace.setSaveStatus("Analysis saved to Locations.");
      setHasSavedAnalysis(true);
      setSaveDialogOpen(false);
      setSaveName("");
    },
    [analysis.state, workspace, createLocation, attachRun],
  );

  const handleSaveReanalysisRun = useCallback(() => {
    if (
      !reanalysisLocationId ||
      !analysis.state.prediction ||
      !analysis.state.financial
    ) {
      workspace.setSaveStatus("Complete an analysis before saving.");
      return;
    }

    const existing = locations.find((item) => item.id === reanalysisLocationId);
    if (!existing) {
      workspace.setSaveStatus("Saved site no longer exists.");
      return;
    }

    const resultToSave: AnalysisResult = {
      prediction: analysis.state.prediction,
      financial: analysis.state.financial,
      explanation: analysis.state.explanation ?? {
        explanation_summary: "Explanation was not available for this run.",
        key_drivers: [],
        physical_interpretation: "",
        uncertainty_notes: "",
        risk_factors: [],
        confidence_assessment: "low",
        financial_insight: null,
      },
      geometry: analysis.state.geometry ?? undefined,
      monthly: analysis.state.monthly ?? undefined,
      data_provenance: analysis.state.dataProvenance ?? undefined,
      physics_simulation: analysis.state.physicsSimulation ?? undefined,
      ml_vs_physics_delta: analysis.state.mlVsPhysicsDelta ?? undefined,
      location: { lat: workspace.state.lat, lon: workspace.state.lon },
    };

    const run = createSavedRunFromAnalysis(
      resultToSave,
      workspace.state.systemConfig,
    );

    upsertLocation({
      ...existing,
      systemConfig: workspace.state.systemConfig,
      updatedAt: new Date().toISOString(),
    });
    attachRun(reanalysisLocationId, run);
    workspace.setSaveStatus("Run added to this location.");
    setHasSavedAnalysis(true);
    setSaveDialogOpen(false);
    setSaveName("");
  }, [
    reanalysisLocationId,
    analysis.state,
    workspace.state,
    workspace,
    locations,
    upsertLocation,
    attachRun,
  ]);

  const handleResetToSetup = useCallback(() => {
    analysis.resetAnalysis();
    setLocationLocked(false);
    setReanalysisLocationName(null);
    setReanalysisLocationId(null);
    setReanalysisBaselineConfig(null);
    setSaveDialogOpen(false);
    setSaveName("");
    setPendingNavigation(null);
    setHasSavedAnalysis(false);
    prefs.setWorkspaceStep(1);
    if (workspace.state.saveStatus) workspace.setSaveStatus(null);
  }, [analysis, workspace, prefs]);

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

  useEffect(() => {
    if (dashboardWorkspace.unsavedAnalysis !== shouldGuardExit) {
      dashboardWorkspace.setUnsavedAnalysis(shouldGuardExit);
    }
  }, [dashboardWorkspace, shouldGuardExit]);

  useEffect(() => {
    const stepLabel =
      prefs.workspaceStep === 1
        ? "Location"
        : prefs.workspaceStep === 2
          ? "Sizing"
          : "Results";
    setBreadcrumb(["Dashboard", stepLabel]);
    register({
      canSaveAnalysis: prefs.workspaceStep === 3 && canSaveAnalysis,
      openSaveAnalysis: () => setSaveDialogOpen(true),
    });
  }, [prefs.workspaceStep, canSaveAnalysis, register, setBreadcrumb]);

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
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(`${url.pathname}${url.search}${url.hash}`);
      setShowExitConfirm(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [shouldGuardExit]);

  // Button navigation bypasses the link-click guard above, so it routes through the same prompt here.
  const navigateGuarded = (href: string) => {
    if (shouldGuardExit) {
      setPendingNavigation(href);
      setShowExitConfirm(true);
      return;
    }
    router.push(href);
  };

  const inputIssue = plannerInputIssue({
    planningScale: prefs.planningScale,
    capacityKw:
      prefs.setupMode === "guided"
        ? prefs.liveCalc.recommendedCapacityKw
        : prefs.systemCapacityKw,
    gridConnection: prefs.gridConnection,
    batteryKwh: prefs.batteryCapacityKwh,
    tariffUsd: prefs.tariffUsd,
    performanceRatio: prefs.performanceRatio,
    monthlyBillUsd: prefs.monthlyBillUsd,
    availableRoofAreaM2: prefs.availableRoofAreaM2,
  });

  const handleRunClick = () => {
    if (inputIssue) {
      analysis.setStreamError(inputIssue);
      return;
    }
    const runnable = !apiOffline && (prefs.locationConfirmed || locationLocked);
    if (runnable && shouldPromptForOwnKey()) {
      setOwnKeyPromptOpen(true);
      return;
    }
    handleAnalyze();
  };

  const pipelineStageLabel =
    isLoading || analysis.state.stage === "error"
      ? STAGE_LABEL[analysis.state.stage] ?? analysis.state.stage
      : null;

  return (
    <div className="pb-8">
      <OwnKeyDialog
        open={ownKeyPromptOpen}
        onOpenChange={setOwnKeyPromptOpen}
        onProceed={handleAnalyze}
      />

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved analysis</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This analysis is not saved. Save it before leaving, or the results
            will be discarded.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
              Stay
            </Button>
            <Button variant="outline" onClick={handleExitConfirmed}>
              Leave without saving
            </Button>
            <Button
              onClick={() => {
                setShowExitConfirm(false);
                setSaveDialogOpen(true);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {locationLocked && reanalysisLocationId
                ? `Save run to ${reanalysisLocationName ?? "site"}`
                : "Save analysis"}
            </DialogTitle>
          </DialogHeader>
          {locationLocked && reanalysisLocationId ? (
            <p className="text-sm text-muted-foreground">
              Attach this run to the existing saved site without renaming it.
            </p>
          ) : (
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Location name</span>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="font-mono-tech w-full border border-[#E6E3DC] bg-[#F3F1EC] px-3 py-2 text-sm"
                placeholder="e.g. Jaipur villa roof"
              />
            </label>
          )}
          {workspace.state.saveStatus ? (
            <p className="text-xs text-muted-foreground">{workspace.state.saveStatus}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSaveAnalysis}
              onClick={() => {
                if (locationLocked && reanalysisLocationId) {
                  handleSaveReanalysisRun();
                } else {
                  handleSaveAnalysis(saveName);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlannerWorkspace
        analysis={analysis.state}
        isSimulating={isLoading}
        apiOffline={apiOffline}
        locationLocked={locationLocked}
        locationLockedLabel={reanalysisLocationName}
        pipelineStageLabel={pipelineStageLabel}
        inputIssue={inputIssue}
        onNavigate={navigateGuarded}
        onExecuteSimulation={handleRunClick}
        onExitReanalysis={handleResetToSetup}
        onSaveAnalysis={() => setSaveDialogOpen(true)}
        onOpenAssistant={() => prefs.setAssistantOpen(true)}
      />

      {analysis.state.error && !isLoading ? (
        <div className="px-6 pt-4">
          <ErrorState message={analysis.state.error} />
        </div>
      ) : null}

    </div>
  );
}
