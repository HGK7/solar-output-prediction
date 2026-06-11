"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import { whatIf } from "@/lib/api";
import type { FinancialSummary, PredictionResult } from "@/types";

interface WhatIfPanelProps {
  prediction: PredictionResult | null;
  baseline: FinancialSummary | null;
}

interface InputState {
  capacityKw: string;
  tariffUsd: string;
  performanceRatio: string;
}

const LIMITS = {
  capacityKw: { min: 0.5, max: 100000 },
  tariffUsd: { min: 0.01, max: 2 },
  performanceRatio: { min: 0.5, max: 0.95 },
} as const;

function parseField(
  raw: string,
  limits: { min: number; max: number },
): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (value < limits.min || value > limits.max) return null;
  return value;
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

  const initialInputs = useMemo<InputState>(
    () => ({
      capacityKw: String(baselineParams?.capacity_kw ?? 5),
      tariffUsd: String(baselineParams?.electricity_tariff_usd_kwh ?? 0.08),
      performanceRatio: String(baselineParams?.performance_ratio ?? 0.78),
    }),
    [baselineParams],
  );

  const [inputs, setInputs] = useState<InputState>(initialInputs);
  const [result, setResult] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputs(initialInputs);
    setResult(null);
    setError(null);
  }, [initialInputs]);

  if (!prediction || !baseline || !baselineParams) return null;

  const parsed = {
    capacityKw: parseField(inputs.capacityKw, LIMITS.capacityKw),
    tariffUsd: parseField(inputs.tariffUsd, LIMITS.tariffUsd),
    performanceRatio: parseField(inputs.performanceRatio, LIMITS.performanceRatio),
  };
  const allValid =
    parsed.capacityKw !== null &&
    parsed.tariffUsd !== null &&
    parsed.performanceRatio !== null;

  const isDirty =
    inputs.capacityKw !== initialInputs.capacityKw ||
    inputs.tariffUsd !== initialInputs.tariffUsd ||
    inputs.performanceRatio !== initialInputs.performanceRatio;

  const runSimulation = async () => {
    if (!allValid || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await whatIf(prediction.prediction, {
        region: baselineParams.region,
        panel_efficiency: baselineParams.panel_efficiency,
        system_capacity_kw: parsed.capacityKw,
        electricity_tariff_usd: parsed.tariffUsd,
        performance_ratio: parsed.performanceRatio,
      });
      setResult(response.financial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed.");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setInputs(initialInputs);
    setResult(null);
    setError(null);
  };

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

  const fields: Array<{
    key: keyof InputState;
    label: string;
    step: string;
    hint: string;
    invalid: boolean;
  }> = [
    {
      key: "capacityKw",
      label: "System capacity (kW)",
      step: "0.5",
      hint: `${LIMITS.capacityKw.min}–${LIMITS.capacityKw.max.toLocaleString()}`,
      invalid: parsed.capacityKw === null,
    },
    {
      key: "tariffUsd",
      label: "Electricity tariff ($/kWh)",
      step: "0.01",
      hint: `${LIMITS.tariffUsd.min}–${LIMITS.tariffUsd.max}`,
      invalid: parsed.tariffUsd === null,
    },
    {
      key: "performanceRatio",
      label: "Performance ratio",
      step: "0.01",
      hint: `${LIMITS.performanceRatio.min}–${LIMITS.performanceRatio.max}`,
      invalid: parsed.performanceRatio === null,
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
          {(isDirty || result) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={reset}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Adjust system parameters and simulate — finances recompute
          deterministically from the same irradiance prediction.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void runSimulation();
          }}
        >
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5 min-w-36 flex-1">
              <Label
                htmlFor={`what-if-${field.key}`}
                className="text-xs text-muted-foreground"
              >
                {field.label}
              </Label>
              <Input
                id={`what-if-${field.key}`}
                type="number"
                inputMode="decimal"
                step={field.step}
                value={inputs[field.key]}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                aria-invalid={field.invalid}
                className={field.invalid ? "border-red-400" : undefined}
              />
              <p className={`text-[10px] ${field.invalid ? "text-red-500" : "text-muted-foreground/70"}`}>
                Range: {field.hint}
              </p>
            </div>
          ))}
          <Button
            type="submit"
            disabled={!allValid || isLoading}
            className="bg-amber-400 text-foreground hover:bg-amber-500"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1.5" />
            )}
            Simulate
          </Button>
        </form>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-white/40">
                <th className="text-left font-medium py-1.5">Metric</th>
                <th className="text-right font-medium py-1.5">Baseline</th>
                <th className="text-right font-medium py-1.5">What-if</th>
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
