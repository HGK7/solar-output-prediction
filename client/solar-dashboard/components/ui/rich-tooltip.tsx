"use client";

import React, { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export interface GlossaryEntry {
  plainTitle: string;
  plainExplanation: string;
  impactOnYou: string;
  benchmark?: string;
  /** Where the number comes from, in plain words. */
  source?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  irradiance: {
    plainTitle: "Daily Sunlight Intensity (kWh/m²/day)",
    plainExplanation:
      'Think of this as the average "hours of full peak sunshine" hitting each square meter of your roof every day. The ± value is the model\'s typical error.',
    impactOnYou:
      "Higher sunlight means fewer solar panels are needed to wipe out the same monthly electric bill.",
    benchmark: "4.5+ is good · 5.5+ is excellent (sunny belt)",
    source:
      "Zenith's sunlight model, using NASA temperature, humidity, wind, and clear-sky averages for your pin.",
  },
  preview_estimate: {
    plainTitle: "Preview estimate",
    plainExplanation:
      "Before you run an analysis, Zenith sizes the system from your bill, tariff, and roof space, with a rough sunlight figure based on your latitude.",
    impactOnYou:
      "Running the analysis replaces these numbers with NASA climate data, the sunlight model, and full costs.",
    source: "Quick calculation in your browser. No data is fetched for the preview.",
  },
  stage_climate: {
    plainTitle: "Climate data",
    plainExplanation:
      "Long-term monthly averages for your pin: sunlight, clear-sky sunlight, temperature, humidity, and wind.",
    impactOnYou:
      "These describe a typical year at your site. They are not a weather forecast.",
    source: "NASA POWER satellite climate service.",
  },
  stage_sunlight: {
    plainTitle: "Sunlight estimate",
    plainExplanation:
      "A trained model turns the climate averages into your average daily sunlight, with a typical error range.",
    impactOnYou:
      "If your climate is unlike the model's training data, a warning appears and the estimate is less certain.",
    source: "Zenith sunlight model.",
  },
  stage_engineering: {
    plainTitle: "Engineering check",
    plainExplanation:
      "A standard engineering formula estimates yearly output from the same climate data, as a second opinion on the sunlight model.",
    impactOnYou:
      "A large gap between the two is a sign to treat the output figures with caution.",
    source: "Standard solar output formula.",
  },
  stage_money: {
    plainTitle: "Costs and savings",
    plainExplanation:
      "Yearly output, system cost, subsidy, battery, payback, 25-year savings, and cost per kWh, from fixed formulas using your size, tariff, and region.",
    impactOnYou: "No AI is used for these figures. The same inputs always give the same result.",
    source: "Zenith cost and savings calculator.",
  },
  stage_layout: {
    plainTitle: "Panel layout",
    plainExplanation:
      "Best panel tilt and direction for your latitude, plus panel count and the roof area they need.",
    impactOnYou: "Tells you whether the panels fit and which way they should face.",
    source: "Sun-position geometry for your coordinates.",
  },
  stage_note: {
    plainTitle: "Written explanation",
    plainExplanation:
      "A short summary of the figures above, citing Zenith's reference guides. It cannot change any number.",
    impactOnYou:
      "If the daily limit is reached, the note is unavailable and every figure still shows.",
    source: "Written by Google Gemini from this run's figures.",
  },
  clear_sky: {
    plainTitle: "Clear-Sky Ceiling (kWh/m²/day)",
    plainExplanation:
      "The maximum sunlight your roof would receive if there were zero clouds or haze all year.",
    impactOnYou:
      "Comparing actual sunlight to the clear-sky ceiling shows how much monsoon or winter cloud cover affects your roof.",
    benchmark: "Typically 10%–25% above actual daily sunlight",
  },
  capacity_kw: {
    plainTitle: "System Size in Kilowatts (kW)",
    plainExplanation:
      "The total power rating of all your solar panels combined under bright sun. One 400-watt residential panel equals 0.4 kW.",
    impactOnYou:
      "A typical home uses 5 kW to 10 kW; a small business typically uses 20 kW to 100 kW.",
    benchmark: "1 kW = ~2.5 panels (~5 m² / 54 sq ft of roof)",
  },
  specific_yield: {
    plainTitle: "Productivity per Kilowatt (kWh/kWp/yr)",
    plainExplanation:
      "How many kilowatt-hours of electricity every 1 kW of solar panels produces in a full year at your location.",
    impactOnYou:
      "Lets you compare solar quality across different cities regardless of how big or small the roof is.",
    benchmark: "1,100–1,400 (Europe) · 1,600–1,900 (India / US Southwest)",
  },
  performance_ratio: {
    plainTitle: "Real-World Efficiency Factor (Performance Ratio)",
    plainExplanation:
      "The percentage of theoretical sunlight that survives real-world heat, dust, wiring, and inverter conversion to become usable AC power in your outlets.",
    impactOnYou:
      "Keeping panels clean and ventilated raises this number and directly boosts your annual savings.",
    benchmark: "0.75 to 0.85 (75%–85%) is standard for modern installations",
  },
  lfp_battery: {
    plainTitle: "LFP Battery Backup (Lithium Iron Phosphate)",
    plainExplanation:
      "Safe, long-life home or commercial battery storage that saves midday solar power so you can run lights, A/C, and machinery at night or during grid outages.",
    impactOnYou:
      "Increases the share of solar power you use yourself from ~58% up to 85%+, and provides instant blackout protection.",
    benchmark: "10–20 kWh for homes · 12–15 year typical cell lifespan",
  },
  lcoe: {
    plainTitle: "Cost per Unit of Solar Electricity (LCOE $/kWh)",
    plainExplanation:
      "Your true locked-in cost for every kWh of electricity your solar panels produce over 25 years, after dividing net cost by lifetime output.",
    impactOnYou:
      "If your solar LCOE is $0.039/kWh and your utility charges $0.08–$0.26/kWh, every unit of solar power is half to one-fifth the price of grid power.",
    benchmark: "$0.03 to $0.06/kWh for rooftop solar after incentives",
  },
  payback: {
    plainTitle: "Payback Crossover (Years)",
    plainExplanation:
      "The exact point when your cumulative monthly electric bill savings completely pay off your net upfront solar cost.",
    impactOnYou:
      "Every year after payback crossover is pure net cash savings in your pocket for the remaining 25+ year panel life.",
    benchmark: "3.5 to 6.5 years is strong for residential & commercial solar",
  },
  tilt_azimuth: {
    plainTitle: "Optimal Panel Tilt & Compass Direction",
    plainExplanation:
      "The angle your panels are propped up (Tilt) and the compass direction they face (Azimuth—Due South in the Northern Hemisphere).",
    impactOnYou:
      "Tilting panels near your latitude angle catches significantly more winter sun and helps rain wash off dust.",
    benchmark: "Tilt roughly equal to your latitude (°N) facing Due South (180°)",
  },
  bos_soft: {
    plainTitle: "BOS (Balance of System) & Soft Costs",
    plainExplanation:
      "BOS covers mounting rails, wiring, breakers, and safety switches. Soft costs cover engineering permits, installation labor, and grid inspection.",
    impactOnYou:
      "Shows the full turnkey price so you are never surprised by hidden installation hardware or permitting fees.",
    benchmark: "Typically 20%–30% of total turnkey installation cost",
  },
  r2_confidence: {
    plainTitle: "Model Fit (R² and typical error)",
    plainExplanation:
      "How closely the sunlight model matched held-back measurements from its training data. RMSE is the typical error in kWh/m²/day.",
    impactOnYou:
      "This describes the model in general, not your site. Sites outside the training climate show a separate warning.",
    source: "Measured when the model was trained.",
  },
};

export interface RichTooltipProps {
  termKey: keyof typeof GLOSSARY | string;
  children: React.ReactNode;
  showUnderline?: boolean;
}

export function RichTooltip({
  termKey,
  children,
  showUnderline = true,
}: RichTooltipProps) {
  const [open, setOpen] = useState(false);
  const info = GLOSSARY[termKey];
  if (!info) return <span>{children}</span>;

  return (
    <span
      className="relative inline-flex items-center gap-1 group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`text-left inline-flex items-center gap-1 focus:outline-none ${
          showUnderline
            ? "underline decoration-dotted decoration-[#F59E0B] underline-offset-4 cursor-help"
            : "cursor-help"
        }`}
      >
        <span>{children}</span>
        <HelpCircle className="w-3.5 h-3.5 text-[#F59E0B] opacity-85 shrink-0 inline" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 p-4 bg-[#18181B] text-[#FAF8F5] border border-[#F59E0B]/50 shadow-xl z-50 text-left rounded-sm font-sans normal-case tracking-normal"
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
            <span className="font-semibold text-xs text-[#F59E0B]">
              {info.plainTitle}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#71717A] hover:text-white text-xs"
              aria-label="Close definition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#FAF8F5]/90 leading-relaxed mt-2">
            {info.plainExplanation}
          </p>
          <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] space-y-1">
            <div>
              <span className="text-[#F59E0B] font-medium">
                What it means for you:{" "}
              </span>
              <span className="text-[#FAF8F5]/85">{info.impactOnYou}</span>
            </div>
            {info.source ? (
              <div className="text-[#FAF8F5]/85">
                <span className="text-[#F59E0B] font-medium">Source: </span>
                {info.source}
              </div>
            ) : null}
            {info.benchmark ? (
              <div className="font-mono tabular-nums text-[10px] text-[#0EA5E9] pt-0.5">
                Typical benchmark: {info.benchmark}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </span>
  );
}

export interface IconButtonTooltipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function IconButtonTooltip({
  label,
  active,
  onClick,
  children,
}: IconButtonTooltipProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`p-2 transition-colors focus:outline-none ${
          active
            ? "bg-[#F59E0B] text-[#18181B]"
            : "text-[#A1A1AA] hover:text-[#FAF8F5]"
        }`}
      >
        {children}
      </button>
      {hovered && (
        <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1 bg-[#18181B] text-[#FAF8F5] border border-white/20 text-[11px] font-sans whitespace-nowrap rounded-xs shadow-lg z-50 pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}
