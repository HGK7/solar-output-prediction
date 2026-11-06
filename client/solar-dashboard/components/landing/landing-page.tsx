"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, GitCompare } from "lucide-react";
import {
  PALETTE,
  REFERENCE_SITES,
  useZenithPreferences,
  type ReferenceSite,
} from "@/context/zenith-preferences-context";
import { RichTooltip } from "@/components/ui/rich-tooltip";
import { SolarNewsFeed } from "@/components/landing/solar-news-feed";
import { RealPlantsProof } from "@/components/landing/real-plants-proof";
import { LegalFooter } from "@/components/legal-footer";

export function LandingPage() {
  const router = useRouter();
  const {
    readingDepth,
    formatTemp,
    showRssFeed,
    handleSelectSite,
    setWorkspaceStep,
  } = useZenithPreferences();

  const handleStartGuidedPlan = () => {
    setWorkspaceStep(1);
    router.push("/dashboard");
  };

  const handleInspectSavedSiteDiff = () => {
    router.push("/locations");
  };

  const handleSelectReferenceSite = (site: ReferenceSite) => {
    // Sample climate presets load the planner — they are not saved portfolio sites.
    handleSelectSite(site);
    setWorkspaceStep(2);
    router.push("/dashboard");
  };

  return (
    <div>
      {/* 1. EDITORIAL HERO SECTION */}
      <section className={`border-b ${PALETTE.rule} ${PALETTE.plane}`}>
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${PALETTE.divide}`}
        >
          {/* Left 7 Cols: Editorial Value Proposition & Actions */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:px-14 lg:py-10 flex flex-col justify-between">
            <div className="space-y-6 max-w-2xl">
              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[48px] font-medium tracking-tight leading-[1.08]">
                Know what your roof will generate before you talk to an
                installer.
              </h1>

              <p
                className={`text-base sm:text-lg ${PALETTE.subInk} leading-relaxed`}
              >
                Pin any home, small business, or industrial facility. Zenith
                combines 38 years of NASA satellite sunlight records with local
                electricity tariffs and subsidies to calculate your true monthly
                savings and payback crossover.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartGuidedPlan}
                  className="px-6 py-3.5 bg-[#F59E0B] text-[#18181B] font-semibold text-sm flex items-center gap-2.5 hover:bg-[#f59e0b]/90 transition-colors"
                >
                  <span>Start Your Roof &amp; Bill Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleInspectSavedSiteDiff}
                  className={`px-5 py-3.5 border ${PALETTE.rule} ${PALETTE.well} text-sm font-medium flex items-center gap-2 ${PALETTE.hoverPlane} transition-colors`}
                >
                  <GitCompare className="w-4 h-4 text-[#F59E0B]" />
                  <span>Compare Saved Site Runs</span>
                </button>
              </div>
            </div>

            {/* Bottom Trust Bar with Rich Tooltips */}
            <div
              className={`mt-8 pt-5 border-t ${PALETTE.rule} grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs`}
            >
              <div>
                <div className="font-semibold">
                  <RichTooltip termKey="irradiance">
                    38-Year NASA Sunlight Archive
                  </RichTooltip>
                </div>
                <p className={`${PALETTE.subInk} mt-1`}>
                  Verified daily sunshine &amp; seasonal cloud cover for any
                  coordinate.
                </p>
              </div>

              <div>
                <div className="font-semibold">
                  <RichTooltip termKey="payback">
                    Defensible 25-Year Cashflow
                  </RichTooltip>
                </div>
                <p className={`${PALETTE.subInk} mt-1`}>
                  Models India PM Surya Ghar, US 30% ITC, and European VAT
                  grants.
                </p>
              </div>

              <div>
                <div className="font-semibold">
                  <RichTooltip termKey="lfp_battery">
                    Stacked Runs &amp; Inline Diffs
                  </RichTooltip>
                </div>
                <p className={`${PALETTE.subInk} mt-1`}>
                  Compare Grid-Tied vs. Hybrid LFP battery setups side-by-side.
                </p>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: real-plant accuracy check */}
          <div className="lg:col-span-5">
            <RealPlantsProof onRunPlant={handleSelectReferenceSite} />
          </div>
        </div>
      </section>

      {/* 2. "SOLAR INDUSTRY HEADLINES" RSS FEED SECTION */}
      {showRssFeed && <SolarNewsFeed />}

      {/* 3. EXPLORE CALIBRATED REFERENCE SITES */}
      <section className="p-8 sm:p-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
          <div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-medium">
              Real Plants You Can Run
            </h2>
            <p className={`text-sm ${PALETTE.subInk} mt-1`}>
              Documented solar plants loaded with their real size, panels, and
              mounting. Run one to see the full analysis and how it compares.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REFERENCE_SITES.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => handleSelectReferenceSite(site)}
              className={`text-left p-5 rounded-lg border ${PALETTE.rule} ${PALETTE.plane} hover:border-[#F59E0B] transition-all flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between font-mono-tech text-xs mb-2">
                  <span className="text-[#D97706] font-semibold">
                    {site.code}
                  </span>
                  <span className={PALETTE.subInk}>
                    {Math.abs(site.lat).toFixed(1)}°{site.lat >= 0 ? "N" : "S"},{" "}
                    {Math.abs(site.lon).toFixed(1)}°{site.lon >= 0 ? "E" : "W"}
                  </span>
                </div>
                <h3 className="font-editorial text-xl font-medium group-hover:text-[#D97706] transition-colors">
                  {site.name}
                </h3>
                <p className={`text-xs ${PALETTE.subInk} mt-1`}>
                  {site.locationLabel}
                </p>
              </div>

              <div
                className={`my-4 pt-3 border-t ${PALETTE.rule} font-mono-tech text-xs space-y-1.5`}
              >
                <div className="flex justify-between">
                  <span className={PALETTE.subInk}>Size:</span>
                  <span className="font-semibold">
                    {site.systemCapacityKw.toLocaleString()} kW · since{" "}
                    {site.benchmark.commissioned.split(" ").pop()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={PALETTE.subInk}>Published:</span>
                  <span>
                    {site.benchmark.reportedAnnualKwh
                      ? `${(site.benchmark.reportedAnnualKwh / 1000).toLocaleString()} MWh/yr`
                      : "Measured data"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={PALETTE.subInk}>Zenith estimate:</span>
                  <span>
                    {Math.round(site.benchmark.zenithAnnualKwh / 1000).toLocaleString()} MWh/yr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={PALETTE.subInk}>NASA sunlight:</span>
                  <span>{site.irradianceDaily} kWh/m²/day</span>
                </div>
                {readingDepth === "detailed" && (
                  <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-current/10">
                    <span className={PALETTE.subInk}>Tilt / Temp:</span>
                    <span>
                      {site.optimalTiltDeg}° · {formatTemp(site.tempC)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Open in Solar Planner</span>
                <ArrowUpRight className="w-4 h-4 text-[#F59E0B]" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <LegalFooter variant="compact" className="px-8 sm:px-12 pb-8" />
    </div>
  );
}
