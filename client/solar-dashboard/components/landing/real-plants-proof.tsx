"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  PALETTE,
  REFERENCE_SITES,
  type ReferenceSite,
} from "@/context/zenith-preferences-context";

function coordLabel(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
}

const kwh = (v: number) => `${Math.round(v).toLocaleString()} kWh/yr`;

/** Landing proof: Zenith's yearly estimate for documented plants next to the operator's published figure. */
export function RealPlantsProof({ onRunPlant }: { onRunPlant: (site: ReferenceSite) => void }) {
  const [selectedId, setSelectedId] = useState(REFERENCE_SITES[0].id);
  const [grown, setGrown] = useState(false);
  const site = REFERENCE_SITES.find((s) => s.id === selectedId) ?? REFERENCE_SITES[0];
  const b = site.benchmark;
  const reported = b.reportedAnnualKwh;
  const scaleMax = Math.max(b.zenithAnnualKwh, reported ?? 0);
  const diffPct = reported ? ((b.zenithAnnualKwh - reported) / reported) * 100 : null;

  // Bars grow after each selection so the comparison reads as a fresh measurement.
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [selectedId]);

  const select = (id: string) => {
    if (id === selectedId) return;
    setGrown(false);
    setSelectedId(id);
  };

  const bar = (value: number, tone: string) => (
    <div className={`h-3 w-full ${PALETTE.well}`}>
      <div
        className={`h-full ${tone} transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none`}
        style={{ width: grown ? `${(value / scaleMax) * 100}%` : "0%" }}
      />
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1.5 px-6 pt-5 pb-4 sm:px-8">
        <h2 className="font-editorial text-2xl font-medium">Checked against real plants</h2>
        <p className={`text-sm leading-relaxed ${PALETTE.subInk}`}>
          Zenith&apos;s yearly estimate for documented solar plants, next to what their
          operators published.
        </p>
      </div>

      <div
        role="group"
        aria-label="Choose a plant"
        className={`grid grid-cols-2 border-y text-left text-xs ${PALETTE.rule}`}
      >
        {REFERENCE_SITES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === selectedId}
            onClick={() => select(s.id)}
            className={`px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#F59E0B] ${
              i >= 2 ? `border-t ${PALETTE.rule}` : ""
            } ${i % 2 === 0 ? `border-r ${PALETTE.rule}` : ""} ${s.id === selectedId ? "bg-[#18181B] text-[#FAF8F5]" : PALETTE.hoverPlane}`}
          >
            <span className="block font-semibold">{s.name}</span>
            <span
              className={`block text-[11px] ${s.id === selectedId ? "text-[#F59E0B]" : PALETTE.subInk}`}
            >
              {s.locationLabel}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 px-6 py-4 sm:px-8">
        <div className="space-y-4" aria-live="polite">
          <div className={`font-mono-tech text-[11px] ${PALETTE.subInk}`}>
            {coordLabel(site.lat, site.lon)} · {site.systemCapacityKw.toLocaleString()} kW · since{" "}
            {b.commissioned}
          </div>

          <div className="space-y-3">
            {reported ? (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium">Published by the operator</span>
                  <span className="font-mono-tech font-bold">{kwh(reported)}</span>
                </div>
                {bar(reported, "bg-[#18181B]")}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">Zenith estimate</span>
                <span className="font-mono-tech font-bold">{kwh(b.zenithAnnualKwh)}</span>
              </div>
              {bar(b.zenithAnnualKwh, "bg-[#F59E0B]")}
            </div>
          </div>

          <p className="text-sm leading-relaxed">
            {diffPct !== null ? (
              <>
                Zenith is{" "}
                <span className="font-mono-tech font-bold">
                  {Math.abs(diffPct).toFixed(1)}% {diffPct >= 0 ? "above" : "below"}
                </span>{" "}
                the published yearly output.
              </>
            ) : (
              b.reportedLabel
            )}
          </p>

          <dl className={`divide-y border-y text-xs ${PALETTE.rule} ${PALETTE.divide}`}>
            {b.facts
              .filter((f) => f.documented)
              .slice(0, 2)
              .map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-2">
                  <dt className={PALETTE.subInk}>{f.label}</dt>
                  <dd className="text-right font-medium">{f.value}</dd>
                </div>
              ))}
          </dl>
          <p className={`text-xs leading-relaxed ${PALETTE.subInk}`}>{b.notes}</p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onRunPlant(site)}
            className="flex w-full items-center justify-between bg-[#F59E0B] px-5 py-3.5 text-sm font-semibold text-[#18181B] transition-colors hover:bg-[#D97706]"
          >
            <span>Run this plant in the planner</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${PALETTE.subInk}`}>
            <span>Sources:</span>
            {b.sources.map((src) => (
              <a
                key={src.url}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-[#18181B]"
              >
                {src.label}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
