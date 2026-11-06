"use client";

import { useMemo } from "react";
import { GitCompare, MessageSquare, Settings2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PALETTE,
  runContextSummary,
  useZenithPreferences,
} from "@/context/zenith-preferences-context";
import { RichTooltip } from "@/components/ui/rich-tooltip";
import {
  RunCompareCashflowChart,
  RunCompareMonthlyChart,
} from "@/components/dashboard/planner-charts";
import { InlineDiffBadge } from "@/components/locations/inline-diff-badge";
import { LocationEditDrawer } from "@/components/locations/location-edit-drawer";
import { computeFullRunDiff } from "@/lib/run-summary-delta";
import type { SavedAnalysisRun, SavedLocationRecord } from "@/types";

interface SiteDashboardProps {
  location: SavedLocationRecord;
  sites: { id: string; name: string }[];
  onSelectSite: (id: string) => void;
  orderedRuns: SavedAnalysisRun[];
  runNumberById: Map<string, number>;
  mode: "single" | "compare";
  onModeChange: (mode: "single" | "compare") => void;
  baseRunId: string;
  compareRunId: string;
  onBaseRunIdChange: (id: string) => void;
  onCompareRunIdChange: (id: string) => void;
  editDrawerOpen: boolean;
  onEditDrawerOpenChange: (open: boolean) => void;
  onLaunchNewRun: () => void;
  onSaveLocation: (next: SavedLocationRecord) => void;
}

function monthlyYieldSeries(run: SavedAnalysisRun | null): number[] {
  if (!run) return Array(12).fill(0);
  const physics = run.result.physics_simulation?.monthly_energy_kwh;
  if (physics?.length) {
    return physics.map((m) => m.energy_kwh);
  }
  const annual = run.result.financial.annual_output_kwh;
  const monthly = run.result.monthly;
  if (monthly) {
    const keys = Object.keys(monthly);
    if (keys.length >= 12) {
      const irrSum = keys.reduce(
        (acc, k) => acc + (monthly[k]?.["Solar Irradiance"] ?? 0),
        0,
      );
      return keys.slice(0, 12).map((k) => {
        const irr = monthly[k]?.["Solar Irradiance"] ?? 0;
        return Math.round((irr / Math.max(irrSum, 1)) * annual);
      });
    }
  }
  return Array.from({ length: 12 }, () => Math.round(annual / 12));
}

export function SiteDashboard({
  location,
  sites,
  onSelectSite,
  orderedRuns,
  runNumberById,
  mode,
  onModeChange,
  baseRunId,
  compareRunId,
  onBaseRunIdChange,
  onCompareRunIdChange,
  editDrawerOpen,
  onEditDrawerOpenChange,
  onLaunchNewRun,
  onSaveLocation,
}: SiteDashboardProps) {
  const {
    readingDepth,
    formatArea,
    formatTemp,
    formatWind,
    setAssistantSiteContext,
    setAssistantOpen,
  } = useZenithPreferences();
  const palette = PALETTE;
  const compareMode = mode === "compare";

  const baseRun =
    orderedRuns.find((r) => r.id === baseRunId) ?? orderedRuns[0] ?? null;
  const comparedRun =
    compareMode && orderedRuns.length >= 2
      ? (orderedRuns.find((r) => r.id === compareRunId) ??
        orderedRuns[1] ??
        null)
      : null;
  const activeRun = compareMode ? baseRun : baseRun;

  const fullDiff =
    compareMode && baseRun && comparedRun
      ? computeFullRunDiff(baseRun, comparedRun)
      : null;

  const baseLabel = baseRun
    ? `Run #${runNumberById.get(baseRun.id) ?? 1}`
    : "Run";
  const compareLabel = comparedRun
    ? `Run #${runNumberById.get(comparedRun.id) ?? 1}`
    : "Compared";

  const coordsLabel = `${Math.abs(location.coordinates.lat).toFixed(4)}° ${
    location.coordinates.lat >= 0 ? "N" : "S"
  }, ${Math.abs(location.coordinates.lon).toFixed(4)}° ${location.coordinates.lon >= 0 ? "E" : "W"}`;

  const codeTag = location.metadata.tags[0] ?? location.id.toUpperCase();

  const monthlyBase = useMemo(() => monthlyYieldSeries(activeRun), [activeRun]);
  const monthlyCompare = useMemo(
    () => (compareMode ? monthlyYieldSeries(comparedRun) : null),
    [compareMode, comparedRun],
  );

  if (!activeRun) {
    return (
      <div className={`border-b p-8 ${palette.plane} ${palette.rule}`}>
        <h1 className="font-editorial text-3xl font-medium">{location.name}</h1>
        <p className={`mt-2 text-sm ${palette.subInk}`}>
          No saved analysis runs for this site yet.
        </p>
        <button
          type="button"
          onClick={onLaunchNewRun}
          className="mt-4 bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-[#18181B]"
        >
          + New Run
        </button>
      </div>
    );
  }

  const fin = activeRun.result.financial;
  const geo = activeRun.result.geometry;
  const pred = activeRun.result.prediction;
  const netCost = fin.net_system_cost_usd ?? fin.total_system_cost_usd;
  const incentive = fin.incentive_amount_usd ?? 0;
  const monthlySavings =
    fin.monthly_savings_usd ?? Math.round(fin.annual_savings_usd / 12);
  const specificYield =
    activeRun.result.physics_simulation?.specific_yield_kwh_per_kw ??
    Math.round(fin.annual_output_kwh / Math.max(0.1, activeRun.systemConfig.systemCapacityKw));
  const capacityFactor =
    activeRun.result.physics_simulation?.capacity_factor_pct ??
    Number(((fin.annual_output_kwh / (activeRun.systemConfig.systemCapacityKw * 8760)) * 100).toFixed(1));
  const selfConsumption =
    fin.battery_summary?.self_consumption_pct ??
    (activeRun.systemConfig.gridConnection === "off-grid"
      ? 98
      : activeRun.systemConfig.gridConnection === "hybrid"
        ? 85
        : 58);
  const numPanels =
    geo?.system_layout.num_panels ??
    fin.sizing_guidance?.estimated_panels ??
    Math.round((activeRun.systemConfig.systemCapacityKw * 1000) / 400);
  const panelArea =
    geo?.system_layout.total_panel_area_m2 ??
    fin.sizing_guidance?.required_roof_area_m2 ??
    numPanels * 2;
  const moduleCost = fin.cost_breakdown?.module_cost_usd ?? Math.round(fin.total_system_cost_usd * 0.44);
  const inverterCost = fin.cost_breakdown?.inverter_cost_usd ?? Math.round(fin.total_system_cost_usd * 0.13);
  const bosCost = fin.cost_breakdown?.bos_cost_usd ?? Math.round(fin.total_system_cost_usd * 0.11);
  const softCost = fin.cost_breakdown?.soft_cost_usd ?? Math.round(fin.total_system_cost_usd * 0.08);
  const batteryCost = fin.battery_summary?.gross_cost_usd ?? 0;

  return (
    <div>
      <div className="border-b border-white/10 bg-[#18181B] p-6 text-[#FAF8F5] lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {sites.length > 1 ? (
              <>
                <h1 className="sr-only">{location.name}</h1>
                <Select value={location.id} onValueChange={onSelectSite}>
                  <SelectTrigger
                    aria-label="Switch saved site"
                    className="h-auto w-auto gap-3 rounded-sm border-0 bg-transparent p-0 font-editorial text-3xl font-medium text-[#FAF8F5] shadow-none hover:text-[#F59E0B] focus-visible:ring-[#F59E0B]/60 sm:text-4xl dark:bg-transparent [&_svg]:size-6 [&_svg]:text-[#F59E0B] [&_svg]:opacity-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" className="rounded-sm">
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <h1 className="font-editorial text-3xl font-medium sm:text-4xl">
                {location.name}
              </h1>
            )}
            <p className="font-mono-tech mt-1.5 text-xs text-[#A1A1AA]">
              {codeTag} · {coordsLabel} · {activeRun.label ?? baseLabel} (
              {new Date(activeRun.createdAt).toLocaleDateString()})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex border border-white/15 bg-[#09090B] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onModeChange("single")}
                className={`px-3 py-1.5 transition-colors ${
                  !compareMode
                    ? "bg-[#F59E0B] font-semibold text-[#18181B]"
                    : "text-[#A1A1AA]"
                }`}
              >
                Single Run View
              </button>
              <button
                type="button"
                disabled={orderedRuns.length < 2}
                onClick={() => onModeChange("compare")}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors disabled:opacity-40 ${
                  compareMode
                    ? "bg-[#F59E0B] font-semibold text-[#18181B]"
                    : "text-[#A1A1AA]"
                }`}
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>Compare Runs</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAssistantSiteContext({
                  label: `${location.name} · ${baseLabel}`,
                  summary: runContextSummary({
                    name: location.name,
                    lat: location.coordinates.lat,
                    lon: location.coordinates.lon,
                    capacityKw: activeRun.systemConfig.systemCapacityKw,
                    gridConnection: activeRun.systemConfig.gridConnection,
                    region: activeRun.systemConfig.region,
                    prediction: pred.prediction,
                    annualOutputKwh: fin.annual_output_kwh,
                    paybackYears: fin.simple_payback_years,
                    netCostUsd: fin.net_system_cost_usd ?? fin.total_system_cost_usd,
                  }),
                });
                setAssistantOpen(true);
              }}
              className="flex items-center gap-1.5 border border-white/15 bg-white/5 px-3 py-2 text-xs text-[#FAF8F5] hover:border-[#F59E0B]"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden />
              <span>Ask Zenith about this run</span>
            </button>

            <button
              type="button"
              onClick={() => onEditDrawerOpenChange(true)}
              className="flex items-center gap-1.5 border border-white/15 bg-white/5 px-3 py-2 text-xs text-[#FAF8F5] hover:border-[#F59E0B]"
            >
              <Settings2 className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span>Edit Site</span>
            </button>

            <button
              type="button"
              onClick={onLaunchNewRun}
              className="bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-[#18181B]"
            >
              + New Run
            </button>
          </div>
        </div>

        <div className="font-mono-tech mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs">
          {!compareMode ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#A1A1AA]">Select Historical Run:</span>
              <select
                value={baseRunId}
                onChange={(e) => onBaseRunIdChange(e.target.value)}
                className="border border-white/20 bg-[#121215] px-3 py-1.5 font-semibold text-[#FAF8F5]"
              >
                {orderedRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label ?? `Run #${runNumberById.get(r.id)}`} —{" "}
                    {r.systemConfig.systemCapacityKw} kW ·{" "}
                    {r.systemConfig.gridConnection} (
                    {new Date(r.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F59E0B]">Base Run:</span>
                <select
                  value={baseRunId}
                  onChange={(e) => onBaseRunIdChange(e.target.value)}
                  className="border border-[#F59E0B] bg-[#121215] px-3 py-1.5 font-semibold text-[#FAF8F5]"
                >
                  {orderedRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label ?? `Run #${runNumberById.get(r.id)}`} (
                      {r.systemConfig.systemCapacityKw} kW{" "}
                      {r.systemConfig.gridConnection})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[#A1A1AA]">vs.</span>
              <div className="flex items-center gap-2">
                <span className="text-[#0EA5E9]">Compared Run:</span>
                <select
                  value={compareRunId}
                  onChange={(e) => onCompareRunIdChange(e.target.value)}
                  className="border border-[#0EA5E9] bg-[#121215] px-3 py-1.5 text-[#FAF8F5]"
                >
                  {orderedRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label ?? `Run #${runNumberById.get(r.id)}`} (
                      {r.systemConfig.systemCapacityKw} kW{" "}
                      {r.systemConfig.gridConnection})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="font-sans text-[#A1A1AA]">
            {location.metadata.notes || `${orderedRuns.length} historical runs on file`}
          </div>
        </div>
      </div>

      {/* Config diff strip */}
      <div
        className={`font-mono-tech grid grid-cols-1 divide-y border-b text-xs sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 ${palette.divide} ${palette.rule} ${palette.well}`}
      >
        <div className="p-4">
          <div className={palette.subInk}>System capacity</div>
          {compareMode && comparedRun ? (
            <div className="mt-1 text-sm font-bold">
              <span className={palette.subInk}>
                {comparedRun.systemConfig.systemCapacityKw.toFixed(1)} kW
              </span>
              <span className="mx-2 text-[#D97706]">→</span>
              <span>{activeRun.systemConfig.systemCapacityKw.toFixed(1)} kW</span>
            </div>
          ) : (
            <div className="mt-1 text-sm font-bold">
              {activeRun.systemConfig.systemCapacityKw.toFixed(1)} kW (
              {activeRun.systemConfig.installationType})
            </div>
          )}
        </div>
        <div className="p-4">
          <div className={palette.subInk}>Grid &amp; storage topology</div>
          {compareMode && comparedRun ? (
            <div className="mt-1 text-sm font-bold">
              <span className={palette.subInk}>
                {comparedRun.systemConfig.gridConnection}
              </span>
              <span className="mx-2 text-[#D97706]">→</span>
              <span>{activeRun.systemConfig.gridConnection}</span>
            </div>
          ) : (
            <div className="mt-1 text-sm font-bold">
              {activeRun.systemConfig.gridConnection}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className={palette.subInk}>Panel efficiency</div>
          {compareMode && comparedRun ? (
            <div className="mt-1 text-sm font-bold">
              <span className={palette.subInk}>
                {comparedRun.systemConfig.panelTechnology}
              </span>
              <span className="mx-2 text-[#D97706]">→</span>
              <span>
                {activeRun.systemConfig.panelTechnology} (PR{" "}
                {activeRun.systemConfig.performanceRatio})
              </span>
            </div>
          ) : (
            <div className="mt-1 text-sm font-bold">
              {activeRun.systemConfig.panelTechnology} · PR{" "}
              {activeRun.systemConfig.performanceRatio}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className={palette.subInk}>Subsidy applied</div>
          <div className="mt-1 text-sm font-bold text-[#16A34A]">
            {fin.incentive_summary ?? "Regional incentive"}
            {incentive > 0 ? ` (-$${incentive.toLocaleString()})` : ""}
          </div>
        </div>
      </div>

      {/* KPI ledger */}
      <div
        className={`grid grid-cols-1 divide-y border-b md:grid-cols-2 md:divide-x lg:grid-cols-3 ${palette.divide} ${palette.rule} ${palette.plane}`}
      >
        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            Annual &amp; monthly bill savings
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-mono-tech text-3xl font-bold text-[#16A34A]">
              ${fin.annual_savings_usd.toLocaleString()}/yr
            </span>
            <InlineDiffBadge
              diff={fullDiff?.annualSavingsUsd}
              compareLabel={compareLabel}
              showPct
              className="rounded-none"
            />
          </div>
          <div className={`font-mono-tech mt-1.5 text-xs ${palette.subInk}`}>
            ~${monthlySavings}/mo saved · Tariff $
            {activeRun.systemConfig.electricityTariffUsd}/kWh
          </div>
        </div>

        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            <RichTooltip termKey="payback">Simple payback crossover</RichTooltip>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-mono-tech text-3xl font-bold">
              {fin.simple_payback_years} yrs
            </span>
            <InlineDiffBadge
              diff={fullDiff?.paybackYears}
              invertTone
              compareLabel={compareLabel}
              showPct={false}
              className="rounded-none"
            />
          </div>
          <div className={`font-mono-tech mt-1.5 flex flex-wrap items-center gap-2 text-xs ${palette.subInk}`}>
            25-Yr ROI: {fin.lifetime_roi_pct}%
            <InlineDiffBadge
              diff={fullDiff?.lifetimeRoiPct}
              compareLabel={compareLabel}
              showPct={false}
              className="rounded-none"
            />
          </div>
        </div>

        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>Net cost after subsidy</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-mono-tech text-3xl font-bold">
              ${netCost.toLocaleString()}
            </span>
            <InlineDiffBadge
              diff={fullDiff?.netCostUsd}
              invertTone
              compareLabel={compareLabel}
              showPct={false}
              className="rounded-none"
            />
          </div>
          <div className={`font-mono-tech mt-1.5 text-xs ${palette.subInk}`}>
            Gross ${fin.total_system_cost_usd.toLocaleString()} · Subsidy -$
            {incentive.toLocaleString()}
          </div>
        </div>

        <div className={`border-t p-6 ${palette.rule}`}>
          <div className={`text-xs ${palette.subInk}`}>
            Annual solar electricity generated
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-mono-tech text-3xl font-bold">
              {fin.annual_output_kwh.toLocaleString()} kWh/yr
            </span>
            <InlineDiffBadge
              diff={fullDiff?.annualOutputKwh}
              compareLabel={compareLabel}
              showPct
              className="rounded-none"
            />
          </div>
          <div className={`font-mono-tech mt-1.5 text-xs ${palette.subInk}`}>
            <RichTooltip termKey="specific_yield">
              {specificYield.toLocaleString()} kWh/kWp
            </RichTooltip>{" "}
            · Capacity factor {capacityFactor}%
          </div>
        </div>

        <div className={`border-t p-6 ${palette.rule}`}>
          <div className={`text-xs ${palette.subInk}`}>
            <RichTooltip termKey="lcoe">
              Levelized cost of energy (25-yr LCOE)
            </RichTooltip>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-mono-tech text-3xl font-bold text-[#0EA5E9]">
              ${fin.lcoe_usd_per_kwh}/kWh
            </span>
            <InlineDiffBadge
              diff={fullDiff?.lcoeUsdPerKwh}
              invertTone
              compareLabel={compareLabel}
              showPct={false}
              className="rounded-none"
            />
          </div>
          <div className={`font-mono-tech mt-1.5 text-xs ${palette.subInk}`}>
            Solar self-consumption: {selfConsumption}%
          </div>
        </div>

        <div className={`border-t p-6 ${palette.rule}`}>
          <div className={`text-xs ${palette.subInk}`}>
            Panels &amp; roof area needed
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-mono-tech text-3xl font-bold">
              {numPanels} panels
            </span>
            <InlineDiffBadge
              diff={fullDiff?.numPanels}
              compareLabel={compareLabel}
              showPct={false}
              className="rounded-none"
            />
          </div>
          <div className={`font-mono-tech mt-1.5 text-xs ${palette.subInk}`}>
            {formatArea(panelArea, true)} ·{" "}
            {geo?.orientation.optimal_tilt_deg ?? "—"}°{" "}
            {geo?.orientation.azimuth_direction ?? "South"}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div
        className={`grid grid-cols-1 divide-y border-b lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide} ${palette.rule} ${palette.plane}`}
      >
        <div className="p-6 lg:col-span-6 lg:p-8">
          <h2 className="font-editorial text-2xl font-medium">
            12-Month Solar Generation Overlay (kWh/mo)
          </h2>
          <p className={`mb-4 text-xs ${palette.subInk}`}>
            {compareMode
              ? `Solid Solar Amber = ${baseLabel} · Dashed Sky Blue = ${compareLabel}`
              : "Monthly electricity generated across the year"}
          </p>
          <div className="h-56">
            <RunCompareMonthlyChart
              baseSeries={monthlyBase}
              compareSeries={monthlyCompare}
              palette={palette}
            />
          </div>
        </div>
        <div className="p-6 lg:col-span-6 lg:p-8">
          <h2 className="font-editorial text-2xl font-medium">
            25-Year Payback Crossover Overlay ($)
          </h2>
          <p className={`mb-4 text-xs ${palette.subInk}`}>
            {compareMode && comparedRun
              ? `Solid Emerald = ${baseLabel} (${fin.simple_payback_years}y) · Dashed Amber = ${compareLabel} (${comparedRun.result.financial.simple_payback_years}y)`
              : "Cumulative net cashflow over 25 years"}
          </p>
          <div className="h-56">
            <RunCompareCashflowChart
              baseNetCostUsd={netCost}
              baseAnnualSavingsUsd={fin.annual_savings_usd}
              compareNetCostUsd={
                comparedRun
                  ? (comparedRun.result.financial.net_system_cost_usd ??
                    comparedRun.result.financial.total_system_cost_usd)
                  : null
              }
              compareAnnualSavingsUsd={
                comparedRun?.result.financial.annual_savings_usd ?? null
              }
              palette={palette}
            />
          </div>
        </div>
      </div>

      {/* Capex strip */}
      <div className={`border-b p-6 lg:p-8 ${palette.rule} ${palette.plane}`}>
        <h2 className="font-editorial mb-4 text-2xl font-medium">
          Itemized Capex, Subsidy &amp; LFP Storage Ledger
        </h2>
        <div className="mb-4 flex h-4 w-full overflow-hidden rounded-xs border border-black/10">
          <div style={{ width: "44%" }} className="bg-[#18181B]" />
          <div style={{ width: "13%" }} className="bg-[#0EA5E9]" />
          <div style={{ width: "11%" }} className="bg-[#38BDF8]" />
          <div style={{ width: "8%" }} className="bg-[#71717A]" />
          <div style={{ width: "24%" }} className="bg-[#F59E0B]" />
        </div>
        <div className="font-mono-tech grid grid-cols-2 gap-4 text-xs sm:grid-cols-5">
          <div>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#18181B]" />
            <span className={palette.subInk}>Modules: </span>
            <span className="font-bold">${moduleCost.toLocaleString()}</span>
          </div>
          <div>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#0EA5E9]" />
            <span className={palette.subInk}>Inverter: </span>
            <span className="font-bold">${inverterCost.toLocaleString()}</span>
          </div>
          <div>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#38BDF8]" />
            <span className={palette.subInk}>BOS &amp; Racking: </span>
            <span className="font-bold">${bosCost.toLocaleString()}</span>
          </div>
          <div>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#71717A]" />
            <span className={palette.subInk}>Permits/Soft: </span>
            <span className="font-bold">${softCost.toLocaleString()}</span>
          </div>
          <div>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#F59E0B]" />
            <span className={palette.subInk}>LFP Storage: </span>
            <span className="font-bold">${batteryCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {readingDepth === "detailed" && (
        <div
          className={`grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide} ${palette.well}`}
        >
          <div className="space-y-4 p-6 lg:col-span-6 lg:p-8">
            <h3 className="font-editorial text-xl font-medium">
              Satellite Weather Telemetry &amp; Calculation Trace
            </h3>
            <div className="font-mono-tech grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <div className={palette.subInk}>Ambient Temp</div>
                <div className="mt-0.5 font-bold">
                  {formatTemp(
                    Object.values(activeRun.result.monthly ?? {})[0]?.Temperature ??
                      25,
                  )}
                </div>
              </div>
              <div>
                <div className={palette.subInk}>Wind Velocity</div>
                <div className="mt-0.5 font-bold">
                  {formatWind(
                    Object.values(activeRun.result.monthly ?? {})[0]?.[
                      "Wind Speed"
                    ] ?? 3,
                  )}
                </div>
              </div>
              <div>
                <div className={palette.subInk}>Relative Humidity</div>
                <div className="mt-0.5 font-bold">
                  {Object.values(activeRun.result.monthly ?? {})[0]?.Humidity ??
                    "—"}
                  %
                </div>
              </div>
              <div>
                <div className={palette.subInk}>R² / RMSE</div>
                <div className="mt-0.5 font-bold">
                  {(pred.metrics.r2 * 100).toFixed(1)}% · {pred.metrics.rmse}
                </div>
              </div>
            </div>
            <div
              className={`font-mono-tech space-y-1 border p-3 text-xs ${palette.plane} ${palette.rule}`}
            >
              <div>
                1. E_annual = {activeRun.systemConfig.systemCapacityKw} kW ×{" "}
                {pred.prediction} kWh/m²/d × 365 × PR{" "}
                {activeRun.systemConfig.performanceRatio} ≈{" "}
                <strong>{fin.annual_output_kwh.toLocaleString()} kWh/yr</strong>
              </div>
              <div>
                2. Net_Capex = ${fin.total_system_cost_usd.toLocaleString()} - $
                {incentive.toLocaleString()} ={" "}
                <strong>${netCost.toLocaleString()}</strong>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-6 lg:col-span-6 lg:p-8">
            <h3 className="font-editorial text-xl font-medium">
              Analysis Explanation
            </h3>
            <p className="text-sm leading-relaxed">
              {activeRun.result.explanation.explanation_summary}
            </p>
            <p className={`text-xs ${palette.subInk}`}>
              {activeRun.result.explanation.financial_insight}
            </p>
          </div>
        </div>
      )}

      <LocationEditDrawer
        open={editDrawerOpen}
        onOpenChange={onEditDrawerOpenChange}
        location={location}
        onSaveLocation={onSaveLocation}
      />
    </div>
  );
}
