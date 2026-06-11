"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { whatIf } from "@/lib/api";
import type { FinancialSummary, PredictionResult } from "@/types";

interface WhatIfPanelProps {
  prediction: PredictionResult | null;
  baseline: FinancialSummary | null;
}

interface SliderState {
  capacityKw: number;
  tariffUsd: number;
  performanceRatio: number;
}

function formatDelta(
  value: number,
  baselineValue: number,
  options?: { invert?: boolean; suffix?: string; digits?: number },
) {
  const digits = options?.digits ?? 1;
  const delta = value - baselineValue;
  if (Math.abs(delta) < 10 ** -digits / 2) return null;
  const better = options?.invert ? delta < 0 : delta > 0;
  return {
    text: `${delta > 0 ? "+" : ""}${delta.toFixed(digits)}${options?.suffix ?? ""}`,
    className: better ? "text-emerald-600" : "text-red-500",
  };
}

export function WhatIfPanel({ prediction, baseline }: WhatIfPanelProps) {
  const baselineParams = baseline?.system_parameters;

  const initialSliders = useMemo<SliderState>(
    () => ({
      capacityKw: baselineParams?.capacity_kw ?? 5,
      tariffUsd: baselineParams?.electricity_tariff_usd_kwh ?? 0.08,
      performanceRatio: baselineParams?.performance_ratio ?? 0.78,
    }),
    [baselineParams],
  );

  const [sliders, setSliders] = useState<SliderState>(initialSliders);
  const [result, setResult] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    setSliders(initialSliders);
    setResult(null);
  }, [initialSliders]);

  const isDirty =
    sliders.capacityKw !== initialSliders.capacityKw ||
    sliders.tariffUsd !== initialSliders.tariffUsd ||
    sliders.performanceRatio !== initialSliders.performanceRatio;

  // Debounced deterministic re-simulation on slider change
  useEffect(() => {
    if (!prediction || !baselineParams || !isDirty) {
      setResult(null);
      setIsLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const response = await whatIf(prediction.prediction, {
          region: baselineParams.region,
          panel_efficiency: baselineParams.panel_efficiency,
          system_capacity_kw: sliders.capacityKw,
          electricity_tariff_usd: sliders.tariffUsd,
          performance_ratio: sliders.performanceRatio,
        });
        if (requestSeq.current === seq) {
          setResult(response.financial);
        }
      } catch (err) {
        if (requestSeq.current === seq) {
          setError(err instanceof Error ? err.message : "Simulation failed.");
          setResult(null);
        }
      } finally {
        if (requestSeq.current === seq) setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [prediction, baselineParams, sliders, isDirty]);

  if (!prediction || !baseline || !baselineParams) return null;

  const compared = result ?? baseline;

  const rows: Array<{
    label: string;
    baseline: string;
    current: string;
    delta: ReturnType<typeof formatDelta>;
  }> = [
    {
      label: "Annual output",
      baseline: `${baseline.annual_output_kwh.toLocaleString()} kWh`,
      current: `${compared.annual_output_kwh.toLocaleString()} kWh`,
      delta: formatDelta(compared.annual_output_kwh, baseline.annual_output_kwh, {
        suffix: " kWh",
        digits: 0,
      }),
    },
    {
      label: "Annual savings",
      baseline: `$${baseline.annual_savings_usd.toLocaleString()}`,
      current: `$${compared.annual_savings_usd.toLocaleString()}`,
      delta: formatDelta(compared.annual_savings_usd, baseline.annual_savings_usd, {
        suffix: " $",
        digits: 0,
      }),
    },
    {
      label: "Payback",
      baseline: `${baseline.simple_payback_years} yr`,
      current: `${compared.simple_payback_years} yr`,
      delta: formatDelta(
        compared.simple_payback_years,
        baseline.simple_payback_years,
        { invert: true, suffix: " yr" },
      ),
    },
    {
      label: "Lifetime ROI",
      baseline: `${baseline.lifetime_roi_pct}%`,
      current: `${compared.lifetime_roi_pct}%`,
      delta: formatDelta(compared.lifetime_roi_pct, baseline.lifetime_roi_pct, {
        suffix: " pp",
      }),
    },
    {
      label: "LCOE",
      baseline: `$${baseline.lcoe_usd_per_kwh}/kWh`,
      current: `$${compared.lcoe_usd_per_kwh}/kWh`,
      delta: formatDelta(compared.lcoe_usd_per_kwh, baseline.lcoe_usd_per_kwh, {
        invert: true,
        suffix: " $",
        digits: 4,
      }),
    },
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-amber-500" />
            What-if simulator
          </span>
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSliders(initialSliders)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Adjust system parameters — finances recompute deterministically from
          the same irradiance prediction.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">System capacity</span>
              <span className="font-medium">{sliders.capacityKw} kW</span>
            </div>
            <Slider
              min={1}
              max={100}
              step={0.5}
              value={[sliders.capacityKw]}
              onValueChange={([value]) =>
                setSliders((s) => ({ ...s, capacityKw: value }))
              }
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Electricity tariff</span>
              <span className="font-medium">${sliders.tariffUsd.toFixed(2)}/kWh</span>
            </div>
            <Slider
              min={0.02}
              max={0.5}
              step={0.01}
              value={[sliders.tariffUsd]}
              onValueChange={([value]) =>
                setSliders((s) => ({ ...s, tariffUsd: value }))
              }
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Performance ratio</span>
              <span className="font-medium">{sliders.performanceRatio.toFixed(2)}</span>
            </div>
            <Slider
              min={0.6}
              max={0.95}
              step={0.01}
              value={[sliders.performanceRatio]}
              onValueChange={([value]) =>
                setSliders((s) => ({ ...s, performanceRatio: value }))
              }
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-white/40">
                <th className="text-left font-medium py-1.5">Metric</th>
                <th className="text-right font-medium py-1.5">Baseline</th>
                <th className="text-right font-medium py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    What-if
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  </span>
                </th>
                <th className="text-right font-medium py-1.5">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-white/20 last:border-0">
                  <td className="py-1.5 text-muted-foreground">{row.label}</td>
                  <td className="py-1.5 text-right">{row.baseline}</td>
                  <td className="py-1.5 text-right font-medium">{row.current}</td>
                  <td className={`py-1.5 text-right text-xs ${row.delta?.className ?? "text-muted-foreground"}`}>
                    {row.delta?.text ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
