"use client";

import Link from "next/link";
import { GitCompare, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceDocumentTrigger } from "@/components/source-document-trigger";
import {
  PALETTE,
  useZenithPreferences,
} from "@/context/zenith-preferences-context";
import { RichTooltip } from "@/components/ui/rich-tooltip";
import {
  CashflowCrossoverChart,
  MonthlyIrradianceChart,
} from "@/components/dashboard/planner-charts";
import {
  hasBackendResults,
  isAnalysisInFlight,
  monthlySeriesFromAnalysis,
} from "@/lib/planner-results-view";
import type { StreamingState } from "@/lib/use-streaming-analysis";
import { AnalysisStageStrip } from "@/components/dashboard/analysis-stage-strip";

const SKELETON_LINE = "h-3.5 w-full rounded-sm bg-[#F3F1EC] motion-reduce:animate-none";

const MODEL_LABEL: Record<string, string> = {
  hist_gradient_boosting: "Gradient-boosted climate model",
  random_forest: "Multi-tree climate model",
  linear_regression: "Linear clear-sky model",
  svm: "Kernel climate model",
};

interface PlannerResultsStepProps {
  analysis: StreamingState;
  systemCapacityKw: number;
  onOpenSavedSites: () => void;
  onSaveAnalysis: () => void;
  onOpenAssistant?: () => void;
  onRerun?: () => void;
}

export function PlannerResultsStep({
  analysis,
  systemCapacityKw,
  onOpenSavedSites,
  onSaveAnalysis,
  onOpenAssistant,
  onRerun,
}: PlannerResultsStepProps) {
  const {
    resultsTab,
    setResultsTab,
    readingDepth,
    formatArea,
    formatTemp,
    formatWind,
    tariffUsd,
    tiltDeg,
    hoveredMonthIdx,
    setHoveredMonthIdx,
    setAssistantDraft,
    setAssistantOpen,
    activeSite,
    selectedSiteId,
    pinCoords,
  } = useZenithPreferences();

  const plant =
    selectedSiteId === activeSite.id &&
    Math.abs(pinCoords.lat - activeSite.lat) < 0.05 &&
    Math.abs(pinCoords.lon - activeSite.lon) < 0.05 &&
    Math.abs(systemCapacityKw - activeSite.systemCapacityKw) < 0.5
      ? activeSite.benchmark
      : null;

  const askAbout = (question: string) => {
    setAssistantDraft(question);
    setAssistantOpen(true);
  };

  const palette = PALETTE;
  const inFlight = isAnalysisInFlight(analysis);
  const ready = hasBackendResults(analysis);
  const fin = analysis.financial;
  const pred = analysis.prediction;
  const geo = analysis.geometry;
  const physics = analysis.physicsSimulation;
  const explanation = analysis.explanation;

  const monthlySeries = monthlySeriesFromAnalysis(analysis);
  const hoveredMonth =
    monthlySeries?.[hoveredMonthIdx] ?? monthlySeries?.[0] ?? null;

  const optimalTilt = geo?.orientation.optimal_tilt_deg ?? tiltDeg;
  const azimuth =
    geo?.orientation.azimuth_direction ?? "Due South";
  const monthlySavings =
    fin?.monthly_savings_usd ??
    (fin ? Math.round(fin.annual_savings_usd / 12) : 0);
  const netCost = fin?.net_system_cost_usd ?? fin?.total_system_cost_usd ?? 0;
  const incentive = fin?.incentive_amount_usd ?? 0;
  const incentiveSummary = fin?.incentive_summary ?? "Regional incentive";
  const panels =
    geo?.system_layout.num_panels ??
    fin?.sizing_guidance?.estimated_panels ??
    Math.round((systemCapacityKw * 1000) / 400);
  const roofArea =
    geo?.system_layout.total_panel_area_m2 ??
    fin?.sizing_guidance?.required_roof_area_m2 ??
    panels * 2;
  const specificYield =
    physics?.specific_yield_kwh_per_kw ??
    (fin
      ? Math.round(fin.annual_output_kwh / Math.max(0.1, systemCapacityKw))
      : 0);
  const capacityFactor =
    physics?.capacity_factor_pct ??
    (fin
      ? Number(
          (
            (fin.annual_output_kwh / (systemCapacityKw * 8760)) *
            100
          ).toFixed(1),
        )
      : 0);

  const breakdown = fin?.cost_breakdown;
  const moduleCost = breakdown?.module_cost_usd ?? 0;
  const inverterCost = breakdown?.inverter_cost_usd ?? 0;
  const bosCost = breakdown?.bos_cost_usd ?? 0;
  const softCost = breakdown?.soft_cost_usd ?? 0;
  const batteryCost = fin?.battery_summary?.gross_cost_usd ?? 0;

  const cashflowYears =
    // Backend cumulative_savings_usd is gross; the chart shows the net position after the system cost.
    fin?.yearly_breakdown.map((y) => ({
      year: y.year,
      cumulativeSavingsUsd: y.cumulative_savings_usd - netCost,
    })) ?? [];

  const avgTemp =
    analysis.annualAverages?.Temperature ??
    (monthlySeries
      ? monthlySeries.reduce((a, m) => a + m.temp, 0) / monthlySeries.length
      : null);
  const avgWind =
    analysis.annualAverages?.["Wind Speed"] ??
    (monthlySeries ? null : null);
  const avgHumidity = analysis.annualAverages?.Humidity ?? null;

  if (inFlight && !ready) {
    return (
      <div>
        <AnalysisStageStrip analysis={analysis} />
        <div className={`border-b px-6 py-16 text-center ${palette.plane} ${palette.rule}`}>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#F59E0B]" />
          <p className="font-editorial mt-4 text-xl">Running solar analysis…</p>
          <p className={`mt-1 text-xs ${palette.subInk}`}>
            Savings and sunlight figures appear as soon as the climate data and
            calculations finish.
          </p>
        </div>
      </div>
    );
  }

  if (!ready || !fin || !pred) {
    return (
      <div className={`border-b px-6 py-16 text-center ${palette.plane} ${palette.rule}`}>
        <p className="font-editorial text-xl">No analysis results yet</p>
        <p className={`mt-2 text-sm ${palette.subInk}`}>
          Confirm a location, set up sizing, then run Solar Analysis. Results use NASA
          climate data for your pin and are not saved until you save them.
        </p>
        {onRerun ? (
          <button
            type="button"
            onClick={onRerun}
            className="mt-4 bg-[#F59E0B] px-5 py-2.5 text-xs font-semibold text-[#18181B]"
          >
            Run Solar Analysis
          </button>
        ) : null}
      </div>
    );
  }

  const drivers = (explanation?.key_drivers ?? []).slice(0, 4);
  const noteLoading = !explanation && inFlight;
  const noteUnavailable =
    !noteLoading && (Boolean(explanation?.error) || !explanation?.explanation_summary);

  return (
    <div>
      <AnalysisStageStrip analysis={analysis} />
      <div
        className={`grid grid-cols-1 divide-y border-b sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 ${palette.divide} ${palette.rule} ${palette.plane}`}
      >
        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            <RichTooltip termKey="stage_money">Estimated monthly savings</RichTooltip>
          </div>
          <div className="font-mono-tech mt-1.5 text-3xl font-bold text-[#16A34A]">
            ~${monthlySavings.toLocaleString()}/mo
          </div>
          <div className={`font-mono-tech mt-1 text-xs ${palette.subInk}`}>
            ${fin.annual_savings_usd.toLocaleString()}/yr saved on electric bills
          </div>
        </div>
        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>Net cost after subsidy</div>
          <div className="font-mono-tech mt-1.5 text-3xl font-bold">
            ${netCost.toLocaleString()}
          </div>
          <div className="font-mono-tech mt-1 text-xs text-[#16A34A]">
            Includes -${incentive.toLocaleString()} ({incentiveSummary})
          </div>
        </div>
        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            <RichTooltip termKey="payback">Simple payback crossover</RichTooltip>
          </div>
          <div className="font-mono-tech mt-1.5 text-3xl font-bold">
            {fin.simple_payback_years} yrs
          </div>
          <div className={`font-mono-tech mt-1 text-xs ${palette.subInk}`}>
            {fin.lifetime_roi_pct}% 25-year return ·{" "}
            <RichTooltip termKey="lcoe">
              ${fin.lcoe_usd_per_kwh}/kWh LCOE
            </RichTooltip>
          </div>
        </div>
        <div className="p-6">
          <div className={`text-xs ${palette.subInk}`}>
            <RichTooltip termKey="capacity_kw">System size &amp; roof fit</RichTooltip>
          </div>
          <div className="font-mono-tech mt-1.5 text-3xl font-bold">
            {systemCapacityKw} kW{" "}
            <span className="text-lg font-normal">({panels} panels)</span>
          </div>
          <div className={`font-mono-tech mt-1 text-xs ${palette.subInk}`}>
            Generates {fin.annual_output_kwh.toLocaleString()} kWh/yr (
            {formatArea(roofArea)} roof)
          </div>
        </div>
      </div>

      {plant ? (
        <div className={`space-y-1.5 border-b px-6 py-4 text-xs ${palette.rule} ${palette.well}`}>
          <p className="text-sm">
            <span className="font-semibold">Compared with the real plant: </span>
            {plant.plantName}.{" "}
            {plant.reportedAnnualKwh ? (
              <>
                Published{" "}
                <span className="font-mono-tech font-bold">
                  {plant.reportedAnnualKwh.toLocaleString()} kWh/yr
                </span>
                , this run{" "}
                <span className="font-mono-tech font-bold">
                  {Math.round(fin.annual_output_kwh).toLocaleString()} kWh/yr
                </span>
                {(() => {
                  const pct =
                    ((fin.annual_output_kwh - plant.reportedAnnualKwh) / plant.reportedAnnualKwh) * 100;
                  return `, ${Math.abs(pct).toFixed(1)}% ${pct >= 0 ? "above" : "below"} the published figure.`;
                })()}
              </>
            ) : (
              plant.reportedLabel
            )}
          </p>
          <p className={palette.subInk}>
            Assumed for this run:{" "}
            {plant.facts
              .filter((f) => !f.documented)
              .map((f) => `${f.label}: ${f.value}`)
              .join("; ")}
            . {plant.notes}
          </p>
          <p className="flex flex-wrap gap-x-3">
            {plant.sources.map((src) => (
              <a
                key={src.url}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {src.label}
              </a>
            ))}
          </p>
        </div>
      ) : null}

      {pred.ood_warning ? (
        <p className={`border-b px-6 py-2 text-xs ${palette.rule} ${palette.plane}`}>
          {pred.ood_details?.length
            ? pred.ood_details.join(" ")
            : "This climate is outside the model's training range. Treat the irradiance number as less certain."}
        </p>
      ) : null}

      <div
        className={`flex flex-wrap items-center justify-between gap-4 border-b px-6 py-3 ${palette.well} ${palette.rule}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "sunlight", label: "1. Sunlight, Tilt & Roof Fit" },
            { id: "financials", label: "2. Cost, Subsidy & 25-Year Cashflow" },
            { id: "explanation", label: "3. Drivers & Recommendations" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setResultsTab(t.id)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                resultsTab === t.id
                  ? "bg-[#18181B] font-semibold text-[#FAF8F5]"
                  : `${palette.plane} border ${palette.rule} ${palette.subInk} hover:text-current`
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onOpenSavedSites}
          className="font-mono-tech flex items-center gap-1.5 text-xs font-semibold text-[#D97706] hover:underline"
        >
          <GitCompare className="h-3.5 w-3.5" />
          <span>Open Portfolio / Compare Runs</span>
        </button>
      </div>

      {resultsTab === "sunlight" && (
        <div
          className={`grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide} ${palette.plane}`}
        >
          <div className="p-6 lg:col-span-8 lg:p-8">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 className="font-editorial text-2xl font-medium">
                  12-Month Sunlight Profile vs.{" "}
                  <RichTooltip termKey="clear_sky">Clear-Sky Ceiling</RichTooltip>
                </h2>
                <p className={`mt-0.5 text-xs ${palette.subInk}`}>
                  NASA satellite climate averages for this pin. Cloud loss is the gap
                  between actual and clear-sky sunlight.
                </p>
              </div>
              {hoveredMonth ? (
                <div
                  className={`border px-3 py-1.5 font-mono-tech text-xs ${palette.well} ${palette.rule}`}
                >
                  <strong>{hoveredMonth.m}:</strong>{" "}
                  <span className="font-bold text-[#D97706]">
                    {hoveredMonth.irr} kWh/m²/d
                  </span>{" "}
                  · Ceiling {hoveredMonth.clear} · Cloud loss {hoveredMonth.cloudLoss}% ·{" "}
                  {formatTemp(hoveredMonth.temp)}
                </div>
              ) : null}
            </div>
            <div className="h-60">
              {monthlySeries ? (
                <MonthlyIrradianceChart
                  series={monthlySeries}
                  hoveredIdx={hoveredMonthIdx}
                  onHoverIdx={setHoveredMonthIdx}
                  palette={palette}
                />
              ) : (
                <p className={`text-sm ${palette.subInk}`}>
                  Monthly irradiance series unavailable for this run.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5 p-6 lg:col-span-4 lg:p-8">
            <h3 className="font-editorial text-xl font-medium">
              Panel Angle &amp; Weather Summary
            </h3>
            <div className={`border-y py-3 text-xs ${palette.rule}`}>
              <div className="flex items-center justify-between">
                <RichTooltip termKey="tilt_azimuth">Best panel angle</RichTooltip>
                <span className="font-mono-tech font-bold text-[#D97706]">
                  {optimalTilt.toFixed(1)}° · {azimuth}
                </span>
              </div>
              <p className={`mt-1 text-[11px] ${palette.subInk}`}>
                Fixed tilt equal to your latitude, facing the equator. Output figures on
                this page assume this angle.
              </p>
            </div>

            <div className="font-mono-tech space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className={palette.subInk}>
                  <RichTooltip termKey="irradiance">Daily sunlight</RichTooltip>
                </span>
                <span className="font-bold">
                  {pred.prediction} ± {pred.error_estimate} {pred.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={palette.subInk}>
                  <RichTooltip termKey="specific_yield">Specific yield</RichTooltip>
                </span>
                <span className="font-bold">
                  {specificYield.toLocaleString()} kWh/kWp/yr
                </span>
              </div>
              {avgTemp != null ? (
                <div className="flex justify-between">
                  <span className={palette.subInk}>Average temperature</span>
                  <span className="font-bold">{formatTemp(avgTemp)}</span>
                </div>
              ) : null}

              {readingDepth === "detailed" && (
                <div className={`mt-3 space-y-2 border-t pt-3 ${palette.rule}`}>
                  <div className="text-[11px] font-semibold text-[#D97706]">
                    Technical details
                  </div>
                  <div className="flex justify-between">
                    <span className={palette.subInk}>
                      <RichTooltip termKey="r2_confidence">Model R² / RMSE</RichTooltip>
                    </span>
                    <span>
                      {(pred.metrics.r2 * 100).toFixed(1)}% · RMSE {pred.metrics.rmse}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={palette.subInk}>Capacity factor</span>
                    <span>{capacityFactor}%</span>
                  </div>
                  {(avgHumidity != null || avgWind != null) && (
                    <div className="flex justify-between">
                      <span className={palette.subInk}>Humidity / Wind</span>
                      <span>
                        {avgHumidity != null ? `${avgHumidity}%` : "—"} ·{" "}
                        {avgWind != null ? formatWind(avgWind) : "—"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={palette.subInk}>Sunlight model</span>
                    <span>{MODEL_LABEL[pred.model_used] ?? "Climate model"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {resultsTab === "financials" && (
        <div
          className={`grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide} ${palette.plane}`}
        >
          <div className="p-6 lg:col-span-6 lg:p-8">
            <h2 className="font-editorial mb-1 text-2xl font-medium">
              25-Year Cumulative Savings &amp;{" "}
              <RichTooltip termKey="payback">Payback Crossover</RichTooltip>
            </h2>
            <p className={`mb-4 text-xs ${palette.subInk}`}>
              Calculated from this run&apos;s sunlight estimate, system size, and tariff.
              Savings pass the net cost at year {fin.simple_payback_years}.
            </p>
            {fin.output_calculation?.steps?.length ? (
              <ol className={`mb-4 space-y-1 font-mono-tech text-[11px] ${palette.subInk}`}>
                {fin.output_calculation.steps.slice(0, 4).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            <div className="h-60">
              {cashflowYears.length > 0 ? (
                <CashflowCrossoverChart
                  yearlyBreakdown={cashflowYears}
                  palette={palette}
                />
              ) : (
                <p className={`text-sm ${palette.subInk}`}>
                  Yearly cashflow breakdown unavailable.
                </p>
              )}
            </div>
            {cashflowYears.length > 0 ? (
              <p className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] ${palette.subInk}`}>
                <span>Each bar: bill savings to date minus net system cost (US$).</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 bg-[#F59E0B]" aria-hidden />
                  Still paying back
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 bg-[#16A34A]" aria-hidden />
                  Savings have passed the cost
                </span>
                <span className="font-mono-tech">
                  Year {cashflowYears[cashflowYears.length - 1].year}: $
                  {Math.round(cashflowYears[cashflowYears.length - 1].cumulativeSavingsUsd).toLocaleString()}
                </span>
              </p>
            ) : null}
          </div>

          <div className="space-y-5 p-6 lg:col-span-6 lg:p-8">
            <h2 className="font-editorial text-2xl font-medium">
              Itemized Capex, Subsidy &amp; LFP Storage Ledger
            </h2>
            {breakdown ? (() => {
              const parts = [
                { w: moduleCost, className: "bg-[#18181B]" },
                { w: inverterCost, className: "bg-[#0EA5E9]" },
                { w: bosCost, className: "bg-[#38BDF8]" },
                { w: softCost, className: "bg-[#71717A]" },
                { w: batteryCost, className: "bg-[#F59E0B]" },
              ];
              const total = parts.reduce((s, p) => s + p.w, 0) || 1;
              return (
                <div className="flex h-4 w-full overflow-hidden rounded-xs border border-black/10">
                  {parts.map((p, i) =>
                    p.w > 0 ? (
                      <div
                        key={i}
                        style={{ width: `${(p.w / total) * 100}%` }}
                        className={p.className}
                      />
                    ) : null,
                  )}
                </div>
              );
            })() : (
              <p className={`text-xs ${palette.subInk}`}>
                An itemized cost split is not available for this run. Totals below are
                complete.
              </p>
            )}
            {breakdown ? (
            <div className="font-mono-tech grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#18181B]" />
                <span className={palette.subInk}>Solar panels: </span>
                <span className="font-bold">${moduleCost.toLocaleString()}</span>
              </div>
              <div>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#0EA5E9]" />
                <span className={palette.subInk}>Inverter: </span>
                <span className="font-bold">${inverterCost.toLocaleString()}</span>
              </div>
              <div>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#38BDF8]" />
                <span className={palette.subInk}>
                  <RichTooltip termKey="bos_soft">BOS &amp; Racking</RichTooltip>:{" "}
                </span>
                <span className="font-bold">${bosCost.toLocaleString()}</span>
              </div>
              <div>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#71717A]" />
                <span className={palette.subInk}>Permits &amp; labor: </span>
                <span className="font-bold">${softCost.toLocaleString()}</span>
              </div>
              <div>
                <span className="mr-1.5 inline-block h-2.5 w-2.5 bg-[#F59E0B]" />
                <span className={palette.subInk}>
                  <RichTooltip termKey="lfp_battery">LFP Battery</RichTooltip>:{" "}
                </span>
                <span className="font-bold">${batteryCost.toLocaleString()}</span>
              </div>
              <div>
                <span className={palette.subInk}>Annual O&amp;M: </span>
                <span className="font-bold">${fin.annual_maintenance_usd}/yr</span>
              </div>
            </div>
            ) : null}
            <div
              className={`font-mono-tech grid grid-cols-3 gap-4 border-t pt-4 text-xs ${palette.rule}`}
            >
              <div>
                <div className={palette.subInk}>Gross System Cost</div>
                <div className="mt-0.5 text-lg font-bold">
                  ${fin.total_system_cost_usd.toLocaleString()}
                </div>
              </div>
              <div>
                <div className={palette.subInk}>{incentiveSummary}</div>
                <div className="mt-0.5 text-lg font-bold text-[#16A34A]">
                  -${incentive.toLocaleString()}
                </div>
              </div>
              <div>
                <div className={palette.subInk}>Net Cost After Subsidy</div>
                <div className="mt-0.5 text-lg font-bold text-[#D97706]">
                  ${netCost.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {resultsTab === "explanation" && (
        <div
          className={`grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide} ${palette.plane}`}
        >
          <div className="space-y-5 p-6 lg:col-span-6 lg:p-8">
            <h2 className="font-editorial text-2xl font-medium">
              Analysis Summary &amp; Key Drivers
            </h2>
            {noteLoading ? (
              <div role="status" aria-live="polite" aria-busy="true" className="space-y-5">
                <p className={`text-sm ${palette.subInk}`}>
                  Writing the explanation. The figures on this page are already final.
                </p>
                <div className="space-y-2.5" aria-hidden>
                  <Skeleton className={SKELETON_LINE} />
                  <Skeleton className={`${SKELETON_LINE} w-11/12`} />
                  <Skeleton className={`${SKELETON_LINE} w-2/3`} />
                </div>
                <div className="space-y-3 pt-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`flex justify-between border-b pb-2 ${palette.rule}`}>
                      <Skeleton className={`${SKELETON_LINE} w-2/5`} />
                      <Skeleton className={`${SKELETON_LINE} w-16`} />
                    </div>
                  ))}
                </div>
              </div>
            ) : noteUnavailable ? (
              <div role="status" className="space-y-2 text-sm leading-relaxed">
                <p>
                  {explanation?.error
                    ? "The written explanation is unavailable right now, usually because the shared daily limit was reached."
                    : "A written explanation was not returned for this run."}{" "}
                  Savings, sunlight, and payback on this page are unaffected.
                </p>
                <Link
                  href="/preferences"
                  className="inline-block text-xs font-semibold text-[#D97706] underline underline-offset-2"
                >
                  Use your own Gemini key
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed">{explanation?.explanation_summary}</p>
                {explanation?.physical_interpretation ? (
                  <p className={`text-sm ${palette.subInk}`}>
                    {explanation.physical_interpretation}
                  </p>
                ) : null}
                {explanation?.citations?.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={palette.subInk}>Sources:</span>
                    {[...new Map(explanation.citations.map((c) => [c.source, c])).values()].map((c) => (
                      <SourceDocumentTrigger
                        key={c.source}
                        source={c.source}
                        sourcePath={c.source_path}
                        excerpt={c.chunk}
                        variant="badge"
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}
            <div className="space-y-3 pt-2 text-xs">
              {noteLoading || noteUnavailable
                ? null
                : drivers.length === 0
                  ? (
                    <p className={palette.subInk}>No key drivers were listed for this run.</p>
                  )
                  : drivers.map((d, i) => {
                    const label =
                      typeof d === "string"
                        ? d
                        : `${d.feature}${d.unit ? ` (${d.value} ${d.unit})` : ""}`;
                    const impact =
                      typeof d === "object" && d?.impact ? d.impact : "";
                    return (
                      <div
                        key={`${label}-${i}`}
                        className={`flex justify-between border-b pb-2 font-medium ${palette.rule}`}
                      >
                        <span>{label}</span>
                        {impact ? (
                          <span className="font-mono-tech">{impact}</span>
                        ) : null}
                      </div>
                    );
                  })}
            </div>
          </div>

          <div className="space-y-4 p-6 lg:col-span-6 lg:p-8">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-2xl font-medium">
                Insights &amp; Next Steps
              </h2>
              {onOpenAssistant ? (
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="text-xs font-semibold text-[#D97706] hover:underline"
                >
                  Ask Solar Guide →
                </button>
              ) : null}
            </div>
            <div className={`divide-y border-y ${palette.divide} ${palette.rule}`}>
              {[
                {
                  title: "Panel Orientation",
                  metric: `${optimalTilt.toFixed(1)}° · ${azimuth}`,
                  detail: "Best panel angle and direction for this latitude.",
                  question: null as string | null,
                },
                {
                  title: "Grid Parity",
                  metric: `$${fin.lcoe_usd_per_kwh}/kWh vs $${tariffUsd}/kWh tariff`,
                  detail: noteLoading ? (
                    <Skeleton aria-hidden className={`${SKELETON_LINE} mt-1`} />
                  ) : (
                    explanation?.financial_insight ??
                    "Cost per kWh of solar over 25 years, compared with the tariff used in this run."
                  ),
                  question: `My solar cost is $${fin.lcoe_usd_per_kwh}/kWh and my tariff is $${tariffUsd}/kWh. What does that mean for my savings?`,
                },
                {
                  title: "Confidence",
                  metric: noteLoading ? (
                    <Skeleton aria-hidden className={`${SKELETON_LINE} mt-0.5 w-24`} />
                  ) : explanation?.confidence_assessment ? (
                    `${explanation.confidence_assessment.charAt(0).toUpperCase()}${explanation.confidence_assessment.slice(1)} confidence`
                  ) : (
                    "Model error range"
                  ),
                  detail: noteLoading
                    ? "Being written with the explanation."
                    : (explanation?.uncertainty_notes ??
                      `Sunlight estimate ± ${pred.error_estimate} ${pred.unit}.`),
                  question: `How reliable is a sunlight estimate of ${pred.prediction} ± ${pred.error_estimate} ${pred.unit} for my site?`,
                },
              ].map((rec) => (
                <div key={rec.title} className="space-y-1 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold">{rec.title}</span>
                    <span className="font-mono-tech text-xs font-bold text-[#16A34A]">
                      {rec.metric}
                    </span>
                  </div>
                  <div className={`text-xs leading-relaxed ${palette.subInk}`}>{rec.detail}</div>
                  {rec.question ? (
                    <button
                      type="button"
                      onClick={() => askAbout(rec.question as string)}
                      className="text-xs font-medium text-[#D97706] underline-offset-2 hover:underline"
                    >
                      Ask about this
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className={`text-xs ${palette.subInk}`}>
                Save this run to compare it with others in Portfolio.
              </p>
              <button
                type="button"
                onClick={onSaveAnalysis}
                className="border border-[#E6E3DC] bg-[#FEFDFB] px-4 py-2 text-xs font-semibold hover:bg-[#F3F1EC]"
              >
                Save &amp; Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
