"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  PALETTE,
  useZenithPreferences,
} from "@/context/zenith-preferences-context";
import { RichTooltip } from "@/components/ui/rich-tooltip";
import {
  healthCheck,
  readAiKeyConfig,
  validateGeminiKey,
  writeAiKeyConfig,
  type HealthCheckResponse,
} from "@/lib/api";
import {
  useGuestPreferencesContext,
  type PreferredMlModel,
} from "@/lib/guest-preferences-context";
import { useWorkspace } from "@/lib/workspace-context";

export function PreferencesPanel() {
  const router = useRouter();
  const palette = PALETTE;
  const {
    readingDepth,
    handleToggleReadingDepth,
    unitSystem,
    setUnitSystem,
    areaUnit,
    setAreaUnit,
    tempUnit,
    setTempUnit,
    windUnit,
    setWindUnit,
    defaultPrefs,
    setDefaultPrefs,
    showRssFeed,
    setShowRssFeed,
    showOodWarnings,
    setShowOodWarnings,
    handleApplyDefaultsToPlanner,
  } = useZenithPreferences();
  const { update } = useGuestPreferencesContext();
  const workspace = useWorkspace();

  const [savedNotice, setSavedNotice] = useState("");
  const [unitsAdvancedOpen, setUnitsAdvancedOpen] = useState(false);
  const [keyMode, setKeyMode] = useState<"system" | "byok">("system");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationState, setValidationState] = useState<{
    status: "idle" | "valid" | "invalid";
    message: string;
    model?: string;
  }>({ status: "idle", message: "" });
  const [healthInfo, setHealthInfo] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    const cfg = readAiKeyConfig();
    setKeyMode(cfg.mode);
    setApiKeyInput(cfg.apiKey);
  }, []);

  useEffect(() => {
    let active = true;
    healthCheck()
      .then((res) => {
        if (active) setHealthInfo(res);
      })
      .catch(() => {
        if (active) setHealthInfo(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const triggerNotice = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => setSavedNotice(""), 3000);
  };

  const handleResetPreferences = () => {
    setUnitSystem("metric");
    handleToggleReadingDepth("simple");
    setDefaultPrefs({
      defaultScale: "homeowner",
      defaultRegion: "india",
      defaultTariffUsd: 0.08,
      defaultPerformanceRatio: 0.78,
      defaultModel: "hist_gradient_boosting",
      autoApplySubsidies: true,
    });
    setShowRssFeed(true);
    setShowOodWarnings(true);
    setUnitsAdvancedOpen(false);
    triggerNotice(
      "All measurement units and planner defaults reset to factory baseline.",
    );
  };

  const handleValidateKey = async () => {
    setValidating(true);
    try {
      const res = await validateGeminiKey(apiKeyInput);
      setValidationState({
        status: res.valid ? "valid" : "invalid",
        message: res.message,
        model: res.model,
      });
      if (res.valid) {
        writeAiKeyConfig({ mode: "byok", apiKey: apiKeyInput.trim() });
        setKeyMode("byok");
      }
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#18181B] p-6 text-[#FAF8F5] lg:p-8">
        <div>
          <h1 className="font-editorial text-3xl font-medium">
            Measurement Units &amp; Planner Defaults
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Changes save automatically in this browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {savedNotice ? (
            <span className="font-mono-tech flex items-center gap-1.5 border border-[#16A34A] bg-[#16A34A]/20 px-3 py-1.5 text-xs text-[#16A34A]">
              <Check className="h-3.5 w-3.5" />
              <span>{savedNotice}</span>
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleResetPreferences}
            className="flex items-center gap-1.5 border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-[#A1A1AA] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Preferences</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleApplyDefaultsToPlanner();
              triggerNotice("Defaults applied to active Solar Planner session.");
            }}
            className="flex items-center gap-1.5 bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-[#18181B]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Apply Defaults to Active Planner</span>
          </button>
        </div>
      </div>

      {/* Units */}
      <div className={`border-b ${palette.rule} ${palette.plane}`}>
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 lg:px-8 ${palette.well} ${palette.rule}`}
        >
          <div>
            <h2 className="font-editorial text-xl font-medium">
              Measurement &amp; Telemetry Units
            </h2>
            <p className={`text-xs ${palette.subInk}`}>
              Choose Metric or Imperial as the default. Open Advanced only if you need
              mixed unit overrides.
            </p>
          </div>
          <span className="font-mono-tech bg-[#18181B] px-2.5 py-1 text-xs text-[#F59E0B]">
            Active: {unitSystem === "metric" ? "Metric" : "Imperial"} ·{" "}
            {areaUnit === "m2" ? "m²" : "sq ft"} · °{tempUnit} ·{" "}
            {windUnit === "ms" ? "m/s" : windUnit === "kmh" ? "km/h" : "mph"}
          </span>
        </div>

        <div className="space-y-4 p-6 lg:p-8">
          <div
            className={`grid max-w-xl grid-cols-2 divide-x border text-xs ${palette.rule} ${palette.divide}`}
          >
            <button
              type="button"
              onClick={() => {
                setUnitSystem("metric");
                triggerNotice("Unit system set to Metric (m², °C, m/s).");
              }}
              className={`px-4 py-3 text-left ${
                unitSystem === "metric"
                  ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                  : palette.hoverPlane
              }`}
            >
              <div>Metric</div>
              <div
                className={`font-mono-tech mt-0.5 text-[11px] ${
                  unitSystem === "metric" ? "text-[#F59E0B]" : palette.subInk
                }`}
              >
                m² · °C · m/s
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitSystem("imperial");
                triggerNotice("Unit system set to Imperial (sq ft, °F, mph).");
              }}
              className={`px-4 py-3 text-left ${
                unitSystem === "imperial"
                  ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                  : palette.hoverPlane
              }`}
            >
              <div>Imperial</div>
              <div
                className={`font-mono-tech mt-0.5 text-[11px] ${
                  unitSystem === "imperial" ? "text-[#F59E0B]" : palette.subInk
                }`}
              >
                sq ft · °F · mph
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setUnitsAdvancedOpen((v) => !v)}
            className={`text-xs font-semibold text-[#D97706] hover:underline`}
          >
            {unitsAdvancedOpen
              ? "Hide advanced unit overrides"
              : "Advanced: override individual units"}
          </button>

          {unitsAdvancedOpen ? (
            <div
              className={`grid grid-cols-1 divide-y border md:grid-cols-3 md:divide-x md:divide-y-0 ${palette.rule} ${palette.divide}`}
            >
              <div className="space-y-3 p-4">
                <span className="text-xs font-semibold">Surface area</span>
                <div
                  className={`font-mono-tech grid grid-cols-2 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                >
                  <button
                    type="button"
                    onClick={() => setAreaUnit("m2")}
                    className={`px-3 py-2 ${
                      areaUnit === "m2"
                        ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                        : palette.hoverPlane
                    }`}
                  >
                    m²
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaUnit("sqft")}
                    className={`px-3 py-2 ${
                      areaUnit === "sqft"
                        ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                        : palette.hoverPlane
                    }`}
                  >
                    sq ft
                  </button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <span className="text-xs font-semibold">Temperature</span>
                <div
                  className={`font-mono-tech grid grid-cols-2 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                >
                  <button
                    type="button"
                    onClick={() => setTempUnit("C")}
                    className={`px-3 py-2 ${
                      tempUnit === "C"
                        ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                        : palette.hoverPlane
                    }`}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempUnit("F")}
                    className={`px-3 py-2 ${
                      tempUnit === "F"
                        ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                        : palette.hoverPlane
                    }`}
                  >
                    °F
                  </button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <span className="text-xs font-semibold">Wind</span>
                <div
                  className={`font-mono-tech grid grid-cols-3 divide-x border text-xs ${palette.rule} ${palette.divide}`}
                >
                  {(
                    [
                      { id: "ms" as const, label: "m/s" },
                      { id: "kmh" as const, label: "km/h" },
                      { id: "mph" as const, label: "mph" },
                    ] as const
                  ).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWindUnit(w.id)}
                      className={`px-2 py-2 ${
                        windUnit === w.id
                          ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                          : palette.hoverPlane
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Planner defaults */}
      <div className={`border-b ${palette.rule} ${palette.plane}`}>
        <div
          className={`flex items-center justify-between border-b px-6 py-4 lg:px-8 ${palette.well} ${palette.rule}`}
        >
          <div>
            <h2 className="font-editorial text-xl font-medium">
              Planner Defaults &amp; Simulation Baseline
            </h2>
            <p className={`text-xs ${palette.subInk}`}>
              Configure your default experience depth, regional subsidy framework, and
              engineering assumptions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              handleApplyDefaultsToPlanner();
              router.push("/dashboard");
            }}
            className="font-mono-tech flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:underline"
          >
            <span>Push Defaults &amp; Open Planner</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className={`grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x lg:grid-cols-3 ${palette.divide}`}
        >
          <div className="space-y-3 p-6 lg:p-8">
            <label className="block text-xs font-semibold">
              Default Interface Complexity
            </label>
            <div
              className={`grid grid-cols-2 divide-x border text-xs ${palette.rule} ${palette.divide}`}
            >
              <button
                type="button"
                onClick={() => handleToggleReadingDepth("simple")}
                className={`px-3 py-2.5 ${
                  readingDepth === "simple"
                    ? "bg-[#F59E0B] font-semibold text-[#18181B]"
                    : palette.hoverPlane
                }`}
              >
                Simple (Homeowner)
              </button>
              <button
                type="button"
                onClick={() => handleToggleReadingDepth("detailed")}
                className={`px-3 py-2.5 ${
                  readingDepth === "detailed"
                    ? "bg-[#F59E0B] font-semibold text-[#18181B]"
                    : palette.hoverPlane
                }`}
              >
                Engineer (Detailed)
              </button>
            </div>
          </div>

          <div className="space-y-3 p-6 lg:p-8">
            <label className="block text-xs font-semibold">
              Default Property Scale Tier
            </label>
            <div
              className={`grid grid-cols-3 divide-x border text-xs ${palette.rule} ${palette.divide}`}
            >
              {(
                [
                  { id: "homeowner" as const, label: "Home" },
                  { id: "small_business" as const, label: "Business" },
                  { id: "industrial" as const, label: "Industrial" },
                ] as const
              ).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() =>
                    setDefaultPrefs((p) => ({ ...p, defaultScale: sc.id }))
                  }
                  className={`px-2 py-2.5 ${
                    defaultPrefs.defaultScale === sc.id
                      ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                      : palette.hoverPlane
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-6 lg:p-8">
            <label className="block text-xs font-semibold">
              Default Region &amp; Subsidy Framework
            </label>
            <div
              className={`font-mono-tech grid grid-cols-4 divide-x border text-xs uppercase ${palette.rule} ${palette.divide}`}
            >
              {(["india", "usa", "europe", "global"] as const).map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() =>
                    setDefaultPrefs((p) => ({ ...p, defaultRegion: reg }))
                  }
                  className={`py-2.5 ${
                    defaultPrefs.defaultRegion === reg
                      ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                      : palette.hoverPlane
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center justify-between pt-2 text-xs">
              <span>Auto-apply regional government subsidies</span>
              <input
                type="checkbox"
                checked={defaultPrefs.autoApplySubsidies}
                onChange={(e) =>
                  setDefaultPrefs((p) => ({
                    ...p,
                    autoApplySubsidies: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[#F59E0B]"
              />
            </label>
          </div>

          <div className={`space-y-3 border-t p-6 lg:p-8 ${palette.rule}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Default Electricity Tariff ($/kWh)</span>
              <span className="font-mono-tech text-sm font-bold">
                ${defaultPrefs.defaultTariffUsd.toFixed(2)}/kWh
              </span>
            </div>
            <input
              type="range"
              min={0.03}
              max={0.5}
              step={0.01}
              value={defaultPrefs.defaultTariffUsd}
              onChange={(e) =>
                setDefaultPrefs((p) => ({
                  ...p,
                  defaultTariffUsd: Number(e.target.value),
                }))
              }
              className="zenith-slider w-full"
            />
          </div>

          <div className={`space-y-3 border-t p-6 lg:p-8 ${palette.rule}`}>
            <div className="flex items-center justify-between text-xs">
              <RichTooltip termKey="performance_ratio">
                <span className="font-semibold">Default Performance Ratio</span>
              </RichTooltip>
              <span className="font-mono-tech text-sm font-bold">
                {defaultPrefs.defaultPerformanceRatio.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.65}
              max={0.9}
              step={0.01}
              value={defaultPrefs.defaultPerformanceRatio}
              onChange={(e) =>
                setDefaultPrefs((p) => ({
                  ...p,
                  defaultPerformanceRatio: Number(e.target.value),
                }))
              }
              className="zenith-slider w-full"
            />
          </div>

          <div className={`space-y-3 border-t p-6 lg:p-8 ${palette.rule}`}>
            <label className="block text-xs font-semibold">
              Default Climate Estimator Model
            </label>
            <select
              value={defaultPrefs.defaultModel}
              onChange={(e) => {
                const model = e.target.value as PreferredMlModel;
                setDefaultPrefs((p) => ({ ...p, defaultModel: model }));
                update({ preferredModel: model });
                workspace.setSystemConfig({
                  ...workspace.state.systemConfig,
                  model,
                });
              }}
              className={`font-mono-tech w-full border px-3 py-2.5 text-xs ${palette.rule} ${palette.well}`}
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

      {/* Identity + feeds + BYOK */}
      <div
        className={`grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide} ${palette.plane}`}
      >
        <div className="space-y-5 p-6 lg:col-span-7 lg:p-8">
          <div className="space-y-3">
            <h2 className="font-editorial text-xl font-medium">Feed &amp; Warning Visibility</h2>
            <label className="flex cursor-pointer items-center justify-between text-xs">
              <span>Show Solar Industry Headlines on Overview</span>
              <input
                type="checkbox"
                checked={showRssFeed}
                onChange={(e) => setShowRssFeed(e.target.checked)}
                className="h-4 w-4 accent-[#F59E0B]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between text-xs">
              <span>Show out-of-distribution climate warnings</span>
              <input
                type="checkbox"
                checked={showOodWarnings}
                onChange={(e) => setShowOodWarnings(e.target.checked)}
                className="h-4 w-4 accent-[#F59E0B]"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 p-6 lg:col-span-5 lg:p-8">
          <div>
            <h2 className="font-editorial text-xl font-medium">
              Gemini API Key (BYOK)
            </h2>
            <p className={`mt-0.5 text-xs ${palette.subInk}`}>
              System key is rate-limited. Bring your own key for unlimited advisor
              explanations.
            </p>
          </div>

          <div
            className={`grid grid-cols-2 divide-x border text-xs ${palette.rule} ${palette.divide}`}
          >
            <button
              type="button"
              onClick={() => {
                setKeyMode("system");
                writeAiKeyConfig({ mode: "system", apiKey: apiKeyInput.trim() });
              }}
              className={`px-3 py-2.5 ${
                keyMode === "system"
                  ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                  : palette.hoverPlane
              }`}
            >
              System Key
            </button>
            <button
              type="button"
              onClick={() => {
                setKeyMode("byok");
                writeAiKeyConfig({ mode: "byok", apiKey: apiKeyInput.trim() });
              }}
              className={`px-3 py-2.5 ${
                keyMode === "byok"
                  ? "bg-[#F59E0B] font-semibold text-[#18181B]"
                  : palette.hoverPlane
              }`}
            >
              Bring Your Own Key
            </button>
          </div>

          {keyMode === "byok" ? (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    writeAiKeyConfig({
                      mode: "byok",
                      apiKey: e.target.value.trim(),
                    });
                  }}
                  placeholder="AIzaSy…"
                  className={`font-mono-tech w-full border px-3 py-2 pr-9 text-xs ${palette.rule} ${palette.well}`}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A]"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <button
                type="button"
                disabled={validating || apiKeyInput.trim().length < 12}
                onClick={handleValidateKey}
                className="bg-[#18181B] px-3 py-2 text-xs font-semibold text-[#FAF8F5] disabled:opacity-40"
              >
                {validating ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" />
                    Validating…
                  </span>
                ) : (
                  "Validate Key"
                )}
              </button>
              <div className="min-h-5 text-xs" aria-live="polite">
                {validationState.status === "valid" ? (
                  <p className="inline-flex items-center gap-1.5 text-[#16A34A]">
                    <CheckCircle2 className="size-3.5" />
                    {validationState.message}
                  </p>
                ) : validationState.status === "invalid" ? (
                  <p className="inline-flex items-center gap-1.5 text-[#DC2626]">
                    <XCircle className="size-3.5" />
                    {validationState.message}
                  </p>
                ) : (
                  <p className={palette.subInk}>
                    Stored only in browser local storage; sent via X-Gemini-Api-Key.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className={`text-xs ${palette.subInk}`}>
              Shared system key active
              {healthInfo?.system_quota
                ? ` · ${healthInfo.system_quota.remaining}/${healthInfo.system_quota.limit} requests remaining this hour`
                : " · 30 requests/hour per IP"}.
            </p>
          )}

          <p className={`font-mono-tech text-[11px] ${palette.subInk}`}>
            Compute:{" "}
            {healthInfo?.compute_capabilities?.cuda_available
              ? `CUDA ${healthInfo.compute_capabilities.gpu_name ?? ""}`
              : "CPU"}
          </p>
        </div>
      </div>
    </div>
  );
}
