"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  PALETTE,
  useZenithPreferences,
} from "@/context/zenith-preferences-context";
import { RichTooltip } from "@/components/ui/rich-tooltip";
import { PlannerResultsStep } from "@/components/dashboard/planner-results-step";
import {
  hasBackendResults,
  isAnalysisInFlight,
} from "@/lib/planner-results-view";
import type { StreamingState } from "@/lib/use-streaming-analysis";

const LocationMap = dynamic(
  () => import("@/components/location-map").then((m) => m.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[22rem] w-full items-center justify-center border border-white/15 bg-[#121215]">
        <Loader2 className="h-6 w-6 animate-spin text-[#F59E0B]" />
      </div>
    ),
  },
);

const SUBSIDY_TARIFF = {
  india: 0.08,
  usa: 0.16,
  europe: 0.25,
  global: 0.12,
} as const;

function subsidyRegionForPin(lat: number, lon: number) {
  // Same boxes as backend infer_region_from_coordinates.
  if (lat >= 5 && lat <= 38.5 && lon >= 68 && lon <= 97.5) return "india" as const;
  if (lat >= 24 && lat <= 49.5 && lon >= -125 && lon <= -66) return "usa" as const;
  if (lat >= 35 && lat <= 71 && lon >= -10 && lon <= 40) return "europe" as const;
  return "global" as const;
}

function formatPin(lat: number, lon: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

interface PlannerWorkspaceProps {
  analysis: StreamingState;
  isSimulating: boolean;
  apiOffline: boolean;
  locationLocked?: boolean;
  locationLockedLabel?: string | null;
  pipelineStageLabel?: string | null;
  /** Why the current inputs cannot run, or null. */
  inputIssue?: string | null;
  /** Navigate away through the unsaved-run prompt. */
  onNavigate?: (href: string) => void;
  onExecuteSimulation: () => void;
  onExitReanalysis?: () => void;
  onSaveAnalysis: () => void;
  onOpenAssistant?: () => void;
}

function InputIssueNotice({ issue }: { issue: string | null }) {
  if (!issue) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 border border-[#D97706] bg-[#D97706]/10 p-3 text-xs"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
      <span>{issue}</span>
    </p>
  );
}

export function PlannerWorkspace({
  analysis,
  isSimulating,
  apiOffline,
  locationLocked = false,
  locationLockedLabel = null,
  pipelineStageLabel = null,
  inputIssue = null,
  onNavigate,
  onExecuteSimulation,
  onExitReanalysis,
  onSaveAnalysis,
  onOpenAssistant,
}: PlannerWorkspaceProps) {
  const router = useRouter();
  const {
    readingDepth,
    handleToggleReadingDepth,
    workspaceStep,
    setWorkspaceStep,
    selectedSiteId,
    activeSite,
    pinCoords,
    setPinCoords,
    setSearchQuery,
    locationConfirmed,
    setLocationConfirmed,
    setupMode,
    setSetupMode,
    planningScale,
    setPlanningScale,
    goal,
    setGoal,
    billInputType,
    setBillInputType,
    monthlyBillUsd,
    setMonthlyBillUsd,
    availableRoofAreaM2,
    setAvailableRoofAreaM2,
    areaUnit,
    setAreaUnit,
    formatArea,
    systemCapacityKw,
    setSystemCapacityKw,
    installationType,
    setInstallationType,
    panelTechnology,
    setPanelTechnology,
    gridConnection,
    setGridConnection,
    batteryCapacityKwh,
    setBatteryCapacityKwh,
    region,
    setRegion,
    tariffUsd,
    setTariffUsd,
    setTiltDeg,
    includeIncentives,
    setIncludeIncentives,
    performanceRatio,
    setPerformanceRatio,
    estimationModel,
    setEstimationModel,
    liveCalc,
  } = useZenithPreferences();

  const palette = PALETTE;
  const spaceWord = installationType === "rooftop" ? "roof" : "site";
  const hasLocation = locationConfirmed || locationLocked;
  useEffect(() => {
    if (!hasLocation && workspaceStep !== 1) setWorkspaceStep(1);
  }, [hasLocation, workspaceStep, setWorkspaceStep]);
  const backendReady = hasBackendResults(analysis);
  const analysisRunning = isAnalysisInFlight(analysis);
  const canOpenResults = backendReady || analysisRunning || analysis.stage === "error";
  const pinMatchesSample =
    Math.abs(pinCoords.lat - activeSite.lat) < 0.05 &&
    Math.abs(pinCoords.lon - activeSite.lon) < 0.05 &&
    selectedSiteId === activeSite.id;
  const previewTiltDeg = pinMatchesSample
    ? activeSite.optimalTiltDeg
    : Math.round(Math.abs(pinCoords.lat) * 10) / 10;
  const previewAzimuth =
    pinMatchesSample
      ? activeSite.azimuthDirection
      : pinCoords.lat >= 0
        ? "Due South"
        : "Due North";

  const goToStep = (step: number) => {
    if (step >= 2 && !hasLocation) return;
    if (step === 3 && !canOpenResults) return;
    setWorkspaceStep(step);
  };

  const openSavedSiteDiff = () => {
    if (onNavigate) onNavigate("/locations");
    else router.push("/locations");
  };

  const step3Sub = analysisRunning
    ? "Analysis in progress…"
    : backendReady && analysis.financial
      ? `~$${Math.round((analysis.financial.monthly_savings_usd ?? analysis.financial.annual_savings_usd / 12))}/mo · ${analysis.financial.simple_payback_years} yr payback`
      : analysis.stage === "error"
        ? "Analysis failed — retry from sizing"
        : "Run analysis for real results";

  return (
    <div>
      {/* TOP STEPPER BAR */}
      <div className={`border-b ${palette.rule} ${palette.plane} px-6 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {[
              {
                step: 1,
                title: "1. Location & Sunlight",
                sub: hasLocation
                  ? pinMatchesSample
                    ? `${pinCoords.lat.toFixed(2)}°, ${pinCoords.lon.toFixed(2)}° · ${activeSite.irradianceDaily} kWh/m²/d`
                    : `${pinCoords.lat.toFixed(2)}°, ${pinCoords.lon.toFixed(2)}°`
                  : "Pin a location on the map to continue",
                locked: false,
              },
              {
                step: 2,
                title: "2. System Sizing",
                sub: hasLocation
                  ? `${liveCalc.activeKw} kW · ${liveCalc.estimatedPanels} panels`
                  : "Confirm location first",
                locked: !hasLocation,
              },
              {
                step: 3,
                title: "3. Savings & Cashflow Plan",
                sub: !hasLocation
                  ? "Confirm location first"
                  : step3Sub,
                locked: !canOpenResults,
              },
            ].map((item) => {
              const isCurrent = workspaceStep === item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  disabled={item.locked}
                  onClick={() => goToStep(item.step)}
                  className={`border px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    isCurrent
                      ? "border-[#18181B] bg-[#18181B] text-[#FAF8F5]"
                      : `${palette.well} ${palette.rule} ${palette.hoverPlane}`
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span>{item.title}</span>
                    {isCurrent ? (
                      <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                    ) : null}
                  </div>
                  <div
                    className={`font-mono-tech mt-0.5 text-[11px] ${
                      isCurrent ? "text-[#F59E0B]" : palette.subInk
                    }`}
                  >
                    {item.sub}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExecuteSimulation}
              disabled={isSimulating || apiOffline || !hasLocation || !!inputIssue}
              title={inputIssue ?? undefined}
              className="flex items-center gap-2 bg-[#F59E0B] px-5 py-2.5 text-xs font-semibold text-[#18181B] hover:bg-[#f59e0b]/90 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>
                {apiOffline
                  ? "Connecting to server…"
                  : !hasLocation
                    ? "Pin a location first"
                    : isSimulating
                      ? "Calculating..."
                      : inputIssue
                        ? "Check sizing inputs"
                        : "Run Solar Analysis"}
              </span>
            </button>
          </div>
        </div>

        {locationLocked ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-[#E6E3DC] bg-[#F3F1EC] px-3 py-2 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Lock className="size-3.5 text-[#D97706]" aria-hidden />
              Re-analysing {locationLockedLabel ?? "saved site"} — coordinates locked
            </div>
            {onExitReanalysis ? (
              <button
                type="button"
                onClick={onExitReanalysis}
                className="inline-flex items-center gap-1.5 font-semibold text-[#D97706] hover:underline"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                New site
              </button>
            ) : null}
          </div>
        ) : null}

        {pipelineStageLabel ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 border border-[#18181B] bg-[#18181B] px-3 py-2 font-mono-tech text-[11px] text-[#F59E0B]"
          >
            {pipelineStageLabel}
          </div>
        ) : null}
      </div>

      {/* STEP 1: LOCATION & SUNLIGHT */}
      {workspaceStep === 1 && (
        <div className="border-b border-white/10 bg-[#18181B] p-6 text-[#FAF8F5] lg:p-8">
          <div className="mb-6">
            <h1 className="font-editorial text-2xl font-medium sm:text-3xl">
              Pin Your Location &amp; Inspect Local Sunlight
            </h1>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Search a city or click the map to place your array. You must confirm a
              pin before sizing or running analysis. Coordinates:{" "}
              <span className="font-mono-tech text-[#F59E0B]">
                {formatPin(pinCoords.lat, pinCoords.lon)}
              </span>
              {hasLocation ? (
                <span className="ml-2 text-[#16A34A]">· Location confirmed</span>
              ) : (
                <span className="ml-2 text-[#D97706]">· Not confirmed yet</span>
              )}
            </p>
          </div>

          <LocationMap
            lat={pinCoords.lat}
            lon={pinCoords.lon}
            disabled={locationLocked}
            onLocationChange={(lat, lon) => {
              setPinCoords({ lat, lon });
              setSearchQuery(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
              setLocationConfirmed(true);
              const onSample =
                Math.abs(lat - activeSite.lat) < 0.05 &&
                Math.abs(lon - activeSite.lon) < 0.05;
              if (!onSample) {
                const nextRegion = subsidyRegionForPin(lat, lon);
                setRegion(nextRegion);
                setTariffUsd(SUBSIDY_TARIFF[nextRegion]);
                setTiltDeg(Math.round(Math.abs(lat) * 10) / 10);
              }
            }}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-[#A1A1AA]">Sunlight preview: </span>
                {pinMatchesSample ? (
                  <>
                    <span className="font-mono-tech font-bold text-[#F59E0B]">
                      {activeSite.irradianceDaily} kWh/m²/day
                    </span>
                    <span className="text-[#A1A1AA]">
                      {" "}
                      ({activeSite.name} sample — NASA POWER confirmed on analysis)
                    </span>
                  </>
                ) : (
                  <span className="text-[#A1A1AA]">
                    NASA POWER climatology loads when you run analysis
                  </span>
                )}
              </div>
              <div>
                <span className="text-[#A1A1AA]">Suggested panel tilt: </span>
                <span className="font-mono-tech font-bold">
                  {previewTiltDeg}° {previewAzimuth}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!hasLocation}
              onClick={() => {
                setLocationConfirmed(true);
                setWorkspaceStep(2);
              }}
              className="flex items-center gap-2 bg-[#F59E0B] px-6 py-2.5 text-xs font-semibold text-[#18181B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                {hasLocation
                  ? "Continue to System Sizing"
                  : "Confirm a map pin to continue"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SIZE YOUR SYSTEM */}
      {workspaceStep === 2 && (
        <div className={palette.plane}>
          <div
            className={`flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 lg:px-8 ${palette.well} ${palette.rule}`}
          >
            <div>
              <h1 className="font-editorial text-2xl font-medium sm:text-3xl">
                Configure Your Solar System
              </h1>
              <p className={`mt-0.5 text-xs ${palette.subInk}`}>
                Size automatically from your monthly bill and roof area, or configure
                custom engineering specifications.
              </p>
            </div>

            <div className={`inline-flex border p-0.5 ${palette.rule} ${palette.plane}`}>
              <button
                type="button"
                onClick={() => {
                  setSetupMode("guided");
                  handleToggleReadingDepth("simple");
                }}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  setupMode === "guided"
                    ? "bg-[#18181B] text-[#FAF8F5]"
                    : palette.subInk
                }`}
              >
                Guided Bill &amp; Roof Sizer
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupMode("engineering");
                  handleToggleReadingDepth("detailed");
                }}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  setupMode === "engineering"
                    ? "bg-[#18181B] text-[#FAF8F5]"
                    : palette.subInk
                }`}
              >
                Engineering Setup
              </button>
            </div>
          </div>

          {setupMode === "guided" ? (
            <div
              className={`grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide}`}
            >
              <div className="space-y-6 p-6 lg:col-span-7 lg:p-8">
                <div>
                  <label className="mb-2 block text-xs font-semibold">
                    Property Scale
                  </label>
                  <div
                    className={`grid grid-cols-3 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                  >
                    {(
                      [
                        {
                          id: "homeowner" as const,
                          label: "Homeowner",
                          desc: "1–15 kW rooftop",
                          bill: 115,
                          roof: 52,
                        },
                        {
                          id: "small_business" as const,
                          label: "Small Business",
                          desc: "15–100 kW commercial",
                          bill: 680,
                          roof: 210,
                        },
                        {
                          id: "industrial" as const,
                          label: "Industrial Site",
                          desc: "100 kW–5 MW array",
                          bill: 2250,
                          roof: 520,
                        },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setPlanningScale(s.id);
                          setMonthlyBillUsd(s.bill);
                          setAvailableRoofAreaM2(s.roof);
                        }}
                        className={`p-3.5 text-left transition-colors ${
                          planningScale === s.id
                            ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                            : palette.hoverPlane
                        }`}
                      >
                        <div>{s.label}</div>
                        <div
                          className={`font-mono-tech mt-0.5 text-[11px] ${
                            planningScale === s.id ? "text-[#F59E0B]" : palette.subInk
                          }`}
                        >
                          {s.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold">
                    Optimization Goal
                  </label>
                  <div
                    className={`grid grid-cols-3 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                  >
                    {(
                      [
                        {
                          id: "lowest_payback" as const,
                          label: "Fastest Payback",
                          sub: "Highest ROI per dollar",
                        },
                        {
                          id: "max_offset" as const,
                          label: "Wipe Out Full Bill",
                          sub: "Target ~100% offset",
                        },
                        {
                          id: "backup_resilience" as const,
                          label: "Outage + Night Backup",
                          sub: "Includes LFP storage",
                        },
                      ] as const
                    ).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGoal(g.id)}
                        className={`p-3.5 text-left transition-colors ${
                          goal === g.id
                            ? "bg-[#F59E0B] font-semibold text-[#18181B]"
                            : palette.hoverPlane
                        }`}
                      >
                        <div>{g.label}</div>
                        <div className="mt-0.5 text-[11px] opacity-80">{g.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <p className={`text-xs ${palette.subInk}`}>
                  Subsidy rule for this run: {region}. Change it in Engineering
                  Setup.
                  {pinMatchesSample
                    ? ""
                    : " Panel count is a latitude estimate until analysis."}
                </p>

                <div className={`border-t pt-4 ${palette.rule}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      Average monthly electricity bill or usage
                    </span>
                    <div
                      className={`inline-flex border font-mono-tech text-[11px] ${palette.rule}`}
                    >
                      <button
                        type="button"
                        onClick={() => setBillInputType("usd")}
                        className={`px-2.5 py-0.5 ${
                          billInputType === "usd"
                            ? "bg-[#18181B] text-[#FAF8F5]"
                            : ""
                        }`}
                      >
                        $/mo Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillInputType("kwh")}
                        className={`px-2.5 py-0.5 ${
                          billInputType === "kwh"
                            ? "bg-[#18181B] text-[#FAF8F5]"
                            : ""
                        }`}
                      >
                        kWh/mo Usage
                      </button>
                    </div>
                  </div>

                  <div className="font-mono-tech mb-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {billInputType === "usd"
                        ? `$${monthlyBillUsd.toLocaleString()}/mo`
                        : `${liveCalc.monthlyKwhConsumption.toLocaleString()} kWh/mo`}
                    </span>
                    <span className={`text-xs ${palette.subInk}`}>
                      Est. {liveCalc.monthlyKwhConsumption.toLocaleString()} kWh/mo @ $
                      {tariffUsd}/kWh
                    </span>
                  </div>

                  <input
                    type="range"
                    min={30}
                    max={
                      planningScale === "homeowner"
                        ? 600
                        : planningScale === "small_business"
                          ? 2500
                          : 5000
                    }
                    step={10}
                    value={monthlyBillUsd}
                    onChange={(e) => setMonthlyBillUsd(Number(e.target.value))}
                    className="zenith-slider w-full"
                  />
                </div>

                <div className={`border-t pt-4 ${palette.rule}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      Usable unshaded {spaceWord} space
                    </span>
                    <div
                      className={`inline-flex border font-mono-tech text-[11px] ${palette.rule}`}
                    >
                      <button
                        type="button"
                        onClick={() => setAreaUnit("m2")}
                        className={`px-2.5 py-0.5 ${
                          areaUnit === "m2" ? "bg-[#18181B] text-[#FAF8F5]" : ""
                        }`}
                      >
                        m²
                      </button>
                      <button
                        type="button"
                        onClick={() => setAreaUnit("sqft")}
                        className={`px-2.5 py-0.5 ${
                          areaUnit === "sqft" ? "bg-[#18181B] text-[#FAF8F5]" : ""
                        }`}
                      >
                        sq ft
                      </button>
                    </div>
                  </div>

                  <div className="font-mono-tech mb-2 text-2xl font-bold">
                    {formatArea(availableRoofAreaM2, true)}
                  </div>

                  <input
                    type="range"
                    min={15}
                    max={planningScale === "homeowner" ? 250 : 1200}
                    step={5}
                    value={availableRoofAreaM2}
                    onChange={(e) => setAvailableRoofAreaM2(Number(e.target.value))}
                    className="zenith-slider w-full"
                  />
                </div>
              </div>

              <div
                className={`flex flex-col justify-between space-y-6 p-6 lg:col-span-5 lg:p-8 ${palette.well}`}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-editorial text-2xl font-medium">
                      Recommended System Sizing
                    </h2>
                    <span className={`text-xs ${palette.subInk}`}>
                      <RichTooltip termKey="preview_estimate">Preview estimate</RichTooltip>
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-4 border-y py-4 ${palette.rule}`}>
                    <div>
                      <div className={`text-xs ${palette.subInk}`}>
                        <RichTooltip termKey="capacity_kw">Recommended size</RichTooltip>
                      </div>
                      <div className="font-mono-tech mt-1 text-2xl font-bold">
                        {liveCalc.recommendedCapacityKw} kW
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${palette.subInk}`}>Estimated panels</div>
                      <div className="font-mono-tech mt-1 text-2xl font-bold">
                        {liveCalc.estimatedPanels} panels
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${palette.subInk}`}>
                        Required roof space
                      </div>
                      <div
                        className={`font-mono-tech mt-1 text-xl font-bold ${
                          liveCalc.roofAreaConstrained
                            ? "text-[#D97706]"
                            : "text-[#16A34A]"
                        }`}
                      >
                        {formatArea(liveCalc.requiredRoofAreaM2)}{" "}
                        <span className="text-xs font-normal">
                          / {formatArea(availableRoofAreaM2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${palette.subInk}`}>
                        Est. monthly savings
                      </div>
                      <div className="font-mono-tech mt-1 text-xl font-bold text-[#16A34A]">
                        ~${liveCalc.monthlySavingsUsd}/mo
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium">Roof Packing Footprint</span>
                      <span className={`font-mono-tech text-[11px] ${palette.subInk}`}>
                        1 panel = {areaUnit === "m2" ? "2 m²" : "21.5 sq ft"}
                      </span>
                    </div>
                    <div className="border border-[#18181B] bg-[#18181B] p-3">
                      <div className="grid grid-cols-6 gap-1.5">
                        {Array.from({
                          length: Math.min(
                            24,
                            Math.max(12, liveCalc.estimatedPanels),
                          ),
                        }).map((_, idx) => {
                          const isNeeded = idx < liveCalc.estimatedPanels;
                          const fits = idx < liveCalc.maxPanelsFitOnRoof;
                          const isOverflow = isNeeded && !fits;
                          return (
                            <div
                              key={idx}
                              className={`font-mono-tech flex h-6 items-center justify-center border text-[9px] ${
                                isOverflow
                                  ? "border-[#D97706] bg-[#D97706]/30 text-white"
                                  : isNeeded
                                    ? "border-[#F59E0B] bg-[#F59E0B] font-semibold text-[#18181B]"
                                    : "border-white/10 bg-white/5 text-white/30"
                              }`}
                            >
                              {isNeeded ? `P${idx + 1}` : "·"}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {liveCalc.estimatedPanels > 24 ? (
                      <p className={`mt-2 text-[11px] ${palette.subInk}`}>
                        Showing 24 of {liveCalc.estimatedPanels} panels.
                      </p>
                    ) : null}
                    {liveCalc.roofAreaConstrained ? (
                      <div className="mt-3 flex items-start gap-2 border border-[#D97706] bg-[#D97706]/15 p-3 text-xs">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                        <span>
                          <strong>Not enough space:</strong> {liveCalc.estimatedPanels}{" "}
                          panels need {formatArea(liveCalc.requiredRoofAreaM2)}, but only{" "}
                          {formatArea(availableRoofAreaM2)} of {spaceWord} space is
                          available. Increase the space or lower the bill target.
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          All {liveCalc.estimatedPanels} panels fit in your{" "}
                          {formatArea(availableRoofAreaM2)} of {spaceWord} space.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <InputIssueNotice issue={inputIssue} />
                <button
                  type="button"
                  onClick={onExecuteSimulation}
                  disabled={isSimulating || apiOffline || !!inputIssue}
                  className="flex w-full items-center justify-between bg-[#F59E0B] px-5 py-3.5 text-sm font-semibold text-[#18181B] hover:bg-[#f59e0b]/90 disabled:opacity-50"
                >
                  <span>Calculate Full Savings &amp; 25-Year Plan</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-6 lg:p-8">
              <div
                className={`grid grid-cols-1 gap-6 border-b pb-6 md:grid-cols-2 lg:grid-cols-4 ${palette.rule}`}
              >
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      <RichTooltip termKey="capacity_kw">System capacity (kW)</RichTooltip>
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={5000}
                      step={0.5}
                      value={systemCapacityKw}
                      onChange={(e) => setSystemCapacityKw(Number(e.target.value))}
                      className={`font-mono-tech w-full border px-3 py-2 text-sm ${palette.rule} ${palette.well}`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Installation mounting
                    </label>
                    <div
                      className={`grid grid-cols-3 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                    >
                      {(["rooftop", "ground-mounted", "carport"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setInstallationType(m)}
                          className={`px-1 py-2 capitalize ${
                            installationType === m
                              ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                              : ""
                          }`}
                        >
                          {m.replace("-", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Panel technology
                    </label>
                    <div
                      className={`grid grid-cols-3 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                    >
                      {(
                        [
                          { id: "monocrystalline" as const, label: "Mono 20%" },
                          { id: "polycrystalline" as const, label: "Poly 17%" },
                          { id: "thin-film" as const, label: "Thin 11%" },
                        ] as const
                      ).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPanelTechnology(p.id)}
                          className={`px-1 py-2 ${
                            panelTechnology === p.id
                              ? "bg-[#F59E0B] font-semibold text-[#18181B]"
                              : ""
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      <RichTooltip termKey="lfp_battery">
                        Grid &amp; battery setup
                      </RichTooltip>
                    </label>
                    <div
                      className={`grid grid-cols-3 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                    >
                      {(
                        [
                          { id: "grid-tied" as const, label: "Grid-Tied" },
                          { id: "hybrid" as const, label: "Hybrid LFP" },
                          { id: "off-grid" as const, label: "Off-Grid" },
                        ] as const
                      ).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setGridConnection(g.id);
                            if (g.id === "grid-tied") setBatteryCapacityKwh(0);
                            if (g.id === "hybrid")
                              setBatteryCapacityKwh(Math.round(systemCapacityKw * 2.0));
                            if (g.id === "off-grid")
                              setBatteryCapacityKwh(Math.round(systemCapacityKw * 3.5));
                          }}
                          className={`px-1 py-2 ${
                            gridConnection === g.id
                              ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                              : ""
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      LFP battery size (kWh)
                    </label>
                    <input
                      type="number"
                      disabled={gridConnection === "grid-tied"}
                      min={0}
                      max={25000}
                      step={2}
                      value={batteryCapacityKwh}
                      onChange={(e) => setBatteryCapacityKwh(Number(e.target.value))}
                      className={`font-mono-tech w-full border px-3 py-2 text-sm disabled:opacity-40 ${palette.rule} ${palette.well}`}
                    />
                    <p className={`mt-1 text-[11px] ${palette.subInk}`}>
                      Auto-sizes to 2.0× kW for Hybrid or 3.5× kW for Off-Grid
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Region &amp; subsidy rule
                    </label>
                    <div
                      className={`grid grid-cols-4 divide-x border text-xs uppercase ${palette.rule} ${palette.divide}`}
                    >
                      {(["india", "usa", "europe", "global"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRegion(r)}
                          className={`py-2 ${
                            region === r
                              ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                              : ""
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Electricity tariff ($/kWh)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      max={5.0}
                      step={0.01}
                      value={tariffUsd}
                      onChange={(e) => setTariffUsd(Number(e.target.value))}
                      className={`font-mono-tech w-full border px-3 py-2 text-sm ${palette.rule} ${palette.well}`}
                    />
                  </div>
                  <label className="flex cursor-pointer items-center justify-between pt-2">
                    <span className="text-xs font-medium">
                      Include government subsidy
                    </span>
                    <input
                      type="checkbox"
                      checked={includeIncentives}
                      onChange={(e) => setIncludeIncentives(e.target.checked)}
                      className="h-4 w-4 accent-[#F59E0B]"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-medium">
                      <RichTooltip termKey="performance_ratio">
                        Performance ratio
                      </RichTooltip>
                      <span className="font-mono-tech font-bold">
                        {performanceRatio.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={0.95}
                      step={0.01}
                      value={performanceRatio}
                      onChange={(e) => setPerformanceRatio(Number(e.target.value))}
                      className="zenith-slider w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Prediction model
                    </label>
                    <select
                      value={estimationModel}
                      onChange={(e) =>
                        setEstimationModel(
                          e.target.value as typeof estimationModel,
                        )
                      }
                      className={`font-mono-tech w-full border px-3 py-2 text-xs ${palette.rule} ${palette.well}`}
                    >
                      <option value="hist_gradient_boosting">
                        Gradient-Boosted Climate Ensemble
                      </option>
                      <option value="random_forest">Multi-Tree Weather Ensemble</option>
                      <option value="linear_regression">Linear Clear-Sky Baseline</option>
                      <option value="svm">Kernel Climate Estimator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <InputIssueNotice issue={inputIssue} />
                <button
                  type="button"
                  onClick={onExecuteSimulation}
                  disabled={isSimulating || apiOffline || !!inputIssue}
                  className="flex items-center gap-2 bg-[#F59E0B] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#18181B] disabled:opacity-50"
                >
                  <span>Run Engineering Simulation</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: SAVINGS & CASHFLOW PLAN — backend results */}
      {workspaceStep === 3 && (
        <PlannerResultsStep
          analysis={analysis}
          systemCapacityKw={systemCapacityKw}
          onOpenSavedSites={openSavedSiteDiff}
          onSaveAnalysis={onSaveAnalysis}
          onOpenAssistant={onOpenAssistant}
          onRerun={onExecuteSimulation}
        />
      )}
    </div>
  );
}
