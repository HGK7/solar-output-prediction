"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Download,
  LayoutGrid,
  Table2,
} from "lucide-react";
import {
  PALETTE,
  useZenithPreferences,
} from "@/context/zenith-preferences-context";
import { RichTooltip } from "@/components/ui/rich-tooltip";
import { queueReanalysisIntent } from "@/lib/reanalysis-intent";
import { downloadRunsCsv } from "@/lib/export-csv";
import { toast } from "sonner";
import type { SavedLocationRecord } from "@/types";

type PortfolioViewMode = "ledger" | "cards" | "benchmark";

function IconButtonTooltip({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`px-3 py-2 transition-colors ${
        active
          ? "bg-[#F59E0B] text-[#18181B]"
          : "text-[#A1A1AA] hover:text-[#FAF8F5]"
      }`}
    >
      {children}
    </button>
  );
}

function specificYield(loc: SavedLocationRecord): number {
  const run = loc.latestRun;
  if (!run) return 0;
  const physics = run.result.physics_simulation?.specific_yield_kwh_per_kw;
  if (physics) return physics;
  const kw = Math.max(0.1, run.systemConfig.systemCapacityKw);
  return Math.round(run.result.financial.annual_output_kwh / kw);
}

function monthlySavings(loc: SavedLocationRecord): number {
  const fin = loc.latestRun?.result.financial;
  if (!fin) return 0;
  return fin.monthly_savings_usd ?? Math.round(fin.annual_savings_usd / 12);
}

interface PortfolioViewProps {
  locations: SavedLocationRecord[];
  initialView?: PortfolioViewMode;
}

export function PortfolioView({
  locations,
  initialView = "cards",
}: PortfolioViewProps) {
  const router = useRouter();
  const { readingDepth, formatArea } = useZenithPreferences();
  const palette = PALETTE;
  const [portfolioView, setPortfolioView] =
    useState<PortfolioViewMode>(initialView);

  const ranked = useMemo(
    () =>
      [...locations].sort(
        (a, b) => specificYield(b) - specificYield(a),
      ),
    [locations],
  );

  const openSite = (loc: SavedLocationRecord) => {
    router.push(`/location/${loc.id}`);
  };

  const reanalyse = (loc: SavedLocationRecord) => {
    queueReanalysisIntent({
      locationId: loc.id,
      locationName: loc.name,
      lat: loc.coordinates.lat,
      lon: loc.coordinates.lon,
      systemConfig: loc.systemConfig,
      requestedAt: Date.now(),
    });
    router.push("/dashboard");
  };

  const exportCsv = () => {
    downloadRunsCsv(locations);
    toast.success("Portfolio CSV exported");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#18181B] p-6 text-[#FAF8F5] lg:p-8">
        <div>
          <h1 className="font-editorial text-3xl font-medium">
            Saved Solar Sites &amp; Portfolio Benchmark
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Compare saved locations, launch new runs, or export your portfolio to
            CSV.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex border border-white/15 bg-[#09090B] p-0.5">
            <IconButtonTooltip
              label="Table View"
              active={portfolioView === "ledger"}
              onClick={() => setPortfolioView("ledger")}
            >
              <Table2 className="h-4 w-4" />
            </IconButtonTooltip>
            <IconButtonTooltip
              label="Site Cards"
              active={portfolioView === "cards"}
              onClick={() => setPortfolioView("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </IconButtonTooltip>
            <IconButtonTooltip
              label="Yield Benchmark"
              active={portfolioView === "benchmark"}
              onClick={() => setPortfolioView("benchmark")}
            >
              <BarChart3 className="h-4 w-4" />
            </IconButtonTooltip>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-[#FAF8F5] hover:border-[#F59E0B]"
          >
            <Download className="h-3.5 w-3.5 text-[#F59E0B]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className={`border-b p-10 text-center ${palette.plane} ${palette.rule}`}>
          <p className="font-editorial text-xl">No saved sites yet</p>
          <p className={`mt-2 text-sm ${palette.subInk}`}>
            Run an analysis in the Solar Planner and save it to build your portfolio.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-4 bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-[#18181B]"
          >
            Open Solar Planner
          </button>
        </div>
      ) : null}

      {portfolioView === "ledger" && locations.length > 0 && (
        <div className="overflow-x-auto">
          <table
            className={`w-full border-collapse text-left text-xs divide-y ${palette.divide}`}
          >
            <thead className={`${palette.well} text-[11px] uppercase ${palette.subInk}`}>
              <tr>
                <th className="px-6 py-3.5">Saved Site</th>
                <th className="px-4 py-3.5">Coordinates</th>
                <th className="px-4 py-3.5">System Size</th>
                <th className="px-4 py-3.5">Roof Area</th>
                {readingDepth === "detailed" && (
                  <th className="px-4 py-3.5">Specific Yield</th>
                )}
                <th className="px-4 py-3.5">Monthly Savings</th>
                <th className="px-4 py-3.5">Payback</th>
                <th className="px-4 py-3.5">Runs</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`font-mono-tech divide-y ${palette.divide} ${palette.plane}`}>
              {locations.map((s) => {
                const run = s.latestRun;
                const roof =
                  s.systemConfig.availableRoofAreaM2 ??
                  run?.result.geometry?.system_layout.total_panel_area_m2 ??
                  0;
                return (
                  <tr key={s.id} className={`${palette.hoverPlane} transition-colors`}>
                    <td className="px-6 py-4 font-sans">
                      <div className="font-editorial text-base font-medium">
                        {s.name}
                      </div>
                      <div className={`text-xs ${palette.subInk}`}>
                        {s.metadata.notes || s.metadata.tags.join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {s.coordinates.lat.toFixed(2)}°N,{" "}
                      {Math.abs(s.coordinates.lon).toFixed(2)}°
                      {s.coordinates.lon >= 0 ? "E" : "W"}
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {s.systemConfig.systemCapacityKw} kW
                    </td>
                    <td className="px-4 py-4">{formatArea(roof)}</td>
                    {readingDepth === "detailed" && (
                      <td className="px-4 py-4">
                        {specificYield(s).toLocaleString()} kWh/kWp
                      </td>
                    )}
                    <td className="px-4 py-4 font-bold text-[#16A34A]">
                      ~${monthlySavings(s).toLocaleString()}/mo
                    </td>
                    <td className="px-4 py-4">
                      {run?.result.financial.simple_payback_years ?? "—"} yrs
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 ${palette.well}`}>
                        {s.runs.length} runs
                      </span>
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-6 py-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => reanalyse(s)}
                        className={`border px-2.5 py-1.5 ${palette.rule} ${palette.well}`}
                      >
                        Re-analyse
                      </button>
                      <button
                        type="button"
                        onClick={() => openSite(s)}
                        className="bg-[#F59E0B] px-3 py-1.5 font-semibold text-[#18181B]"
                      >
                        Open Site →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {portfolioView === "cards" && locations.length > 0 && (
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:p-8">
          {locations.map((s) => {
            const roof =
              s.systemConfig.availableRoofAreaM2 ??
              s.latestRun?.result.geometry?.system_layout.total_panel_area_m2 ??
              0;
            const code = s.metadata.tags[0] ?? s.id.slice(0, 8).toUpperCase();
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => openSite(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openSite(s);
                }}
                className={`group flex cursor-pointer flex-col justify-between border p-6 transition-colors hover:border-[#F59E0B] ${palette.rule} ${palette.plane}`}
              >
                <div>
                  <div className="font-mono-tech mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#D97706]">
                      {code} · {Math.abs(s.coordinates.lat).toFixed(2)}°
                      {s.coordinates.lat >= 0 ? "N" : "S"},{" "}
                      {Math.abs(s.coordinates.lon).toFixed(2)}°
                      {s.coordinates.lon >= 0 ? "E" : "W"}
                    </span>
                    <span className={`px-2 py-0.5 ${palette.well}`}>
                      {s.runs.length} Historical Runs
                    </span>
                  </div>
                  <h2 className="font-editorial text-2xl font-medium group-hover:text-[#D97706]">
                    {s.name}
                  </h2>
                  <p className={`mt-0.5 text-xs ${palette.subInk}`}>
                    {s.metadata.notes || "Saved site"}
                  </p>
                </div>

                <div
                  className={`font-mono-tech my-5 grid grid-cols-4 gap-3 border-y py-4 text-xs ${palette.rule}`}
                >
                  <div>
                    <div className={palette.subInk}>System</div>
                    <div className="mt-0.5 font-bold">
                      {s.systemConfig.systemCapacityKw} kW
                    </div>
                  </div>
                  <div>
                    <div className={palette.subInk}>Roof Footprint</div>
                    <div className="mt-0.5 font-bold">{formatArea(roof)}</div>
                  </div>
                  <div>
                    <div className={palette.subInk}>Savings</div>
                    <div className="mt-0.5 font-bold text-[#16A34A]">
                      ~${monthlySavings(s).toLocaleString()}/mo
                    </div>
                  </div>
                  <div>
                    <div className={palette.subInk}>Payback</div>
                    <div className="mt-0.5 font-bold">
                      {s.latestRun?.result.financial.simple_payback_years ?? "—"} yrs
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reanalyse(s);
                    }}
                    className={`border px-3 py-1.5 hover:border-[#F59E0B] ${palette.rule} ${palette.well}`}
                  >
                    Re-analyse in Planner
                  </button>
                  <span className="flex items-center gap-1 font-semibold text-[#D97706]">
                    <span>Open Site Analysis</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {portfolioView === "benchmark" && locations.length > 0 && (
        <div
          className={`grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0 ${palette.divide} ${palette.plane}`}
        >
          <div className="space-y-5 p-6 lg:col-span-7 lg:p-8">
            <h2 className="font-editorial text-2xl font-medium">
              Specific Yield Benchmark (
              <RichTooltip termKey="specific_yield">kWh/kWp/yr</RichTooltip>)
            </h2>
            <div className="font-mono-tech space-y-4 text-xs">
              {ranked.map((s) => {
                const yieldVal = specificYield(s);
                const barWidth = Math.min(100, Math.round((yieldVal / 2000) * 100));
                const code = s.metadata.tags[0] ?? s.id.slice(0, 8).toUpperCase();
                return (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {s.name} ({code})
                      </span>
                      <span className="font-bold text-[#D97706]">
                        {yieldVal.toLocaleString()} kWh/kWp
                      </span>
                    </div>
                    <div className={`h-3.5 w-full border ${palette.well} ${palette.rule}`}>
                      <div
                        className="h-full bg-[#F59E0B]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-4 p-6 lg:col-span-5 lg:p-8">
            <h2 className="font-editorial text-2xl font-medium">
              Portfolio Insights
            </h2>
            <p className="text-sm leading-relaxed">
              {ranked[0]
                ? `${ranked[0].name} leads this portfolio at ${specificYield(ranked[0]).toLocaleString()} kWh/kWp — the highest productivity per installed kilowatt among your saved sites.`
                : "Save analyzed sites to unlock yield benchmarks."}
            </p>
            <p className="text-sm leading-relaxed">
              Use Compare Runs on any site dashboard to see how capacity, storage, and
              subsidy choices shift payback and net capex.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
