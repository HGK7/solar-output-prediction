"use client";

import { BentoTile, EmptyState, ErrorState, StatusBadge } from "@/components/bento";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Database, Loader2, Satellite, Sun, Wrench } from "lucide-react";
import { InlineDiffBadge } from "@/components/locations/inline-diff-badge";
import type { FullRunDiff, MetricDiff } from "@/lib/run-summary-delta";
import type {
  DataProvenance,
  PhysicsSimulationResult,
  PredictionResult,
} from "@/types";
import { cn } from "@/lib/utils";

interface OutputEngineeringCardProps {
  prediction: PredictionResult | null;
  physicsSimulation: PhysicsSimulationResult | null;
  isPredictionLoading: boolean;
  isEngineeringLoading: boolean;
  dataProvenance?: DataProvenance | null;
  effectiveDelta: {
    delta_kwh: number;
    delta_pct: number | null;
  } | null;
  diff?: FullRunDiff | null;
  compareLabel?: string;
}

export function OutputEngineeringCard({
  prediction,
  physicsSimulation,
  isPredictionLoading,
  isEngineeringLoading,
  dataProvenance,
  effectiveDelta,
  diff = null,
  compareLabel = "Compared run",
}: OutputEngineeringCardProps) {
  if (isPredictionLoading && !prediction) {
    return (
      <BentoTile title="Output estimate" icon={<Sun className="size-4" />}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </BentoTile>
    );
  }

  if (!prediction) {
    return (
      <BentoTile title="Output estimate" icon={<Sun className="size-4" />}>
        <EmptyState
          title="No output estimate."
          description="Run analysis to load prediction and engineering data."
        />
      </BentoTile>
    );
  }

  const r2 = prediction.metrics.r2;
  const confidenceStatus: "ok" | "warn" | "error" =
    r2 > 0.8 ? "ok" : r2 > 0.6 ? "warn" : "error";
  const confidenceLabel =
    r2 > 0.8 ? "High confidence" : r2 > 0.6 ? "Medium confidence" : "Low confidence";

  return (
    <BentoTile
      title="Output estimate"
      icon={<Sun className="size-4" />}
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          {prediction.ood_warning ? (
            <Badge
              variant="outline"
              title={prediction.ood_details?.join("; ") || "Climate inputs outside primary training bounds"}
              className="gap-1 border-status-warn/35 bg-status-warn/10 text-[10px] font-medium text-status-warn"
            >
              <AlertTriangle className="size-3" aria-hidden />
              Extrapolated climate
            </Badge>
          ) : null}
          <StatusBadge status={confidenceStatus} label={confidenceLabel} />
        </div>
      }
    >
      <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="data-label">Estimated irradiance</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {prediction.prediction.toFixed(2)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {prediction.unit}
              </span>
            </p>
            {diff ? (
              <InlineDiffBadge diff={diff.irradiance} compareLabel={compareLabel} />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Uncertainty ± {prediction.error_estimate.toFixed(3)} {prediction.unit}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Accuracy" value={`${(r2 * 100).toFixed(1)}%`} />
          <Stat label="Typical error" value={prediction.metrics.rmse.toFixed(3)} />
          <Stat
            label="Model"
            value={prediction.model_used.replace(/_/g, " ")}
            subBadge={
              diff?.modelUsed.changed ? (
                <span className="font-mono text-[10px] font-normal text-muted-foreground">
                  vs {diff.modelUsed.compareVal.replace(/_/g, " ")}
                </span>
              ) : null
            }
            className="capitalize"
          />
        </div>

        {(prediction.prediction_context || dataProvenance) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {prediction.prediction_context?.data_source === "nasa_api" ? (
              <span className="inline-flex items-center gap-1.5">
                <Satellite className="size-3.5" aria-hidden />
                Satellite climate averages
              </span>
            ) : prediction.prediction_context ? (
              <span className="inline-flex items-center gap-1.5">
                <Database className="size-3.5" aria-hidden />
                Manual inputs
              </span>
            ) : null}
            {dataProvenance ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {dataProvenance.source} · {dataProvenance.date_range}
              </Badge>
            ) : null}
          </div>
        )}

        <div className="border-t border-tile-border pt-3">
          <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Wrench className="size-3.5 text-muted-foreground" aria-hidden />
            Engineering
          </p>
          {isEngineeringLoading && !physicsSimulation ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Running check</span>
            </div>
          ) : physicsSimulation?.status === "ok" ? (
            <div className="space-y-0">
              <Row
                label="Annual energy"
                value={`${physicsSimulation.annual_energy_kwh?.toLocaleString()} kWh`}
                diff={diff?.annualEnergyKwh}
                compareLabel={compareLabel}
              />
              <Row
                label="Capacity factor"
                value={`${physicsSimulation.capacity_factor_pct}%`}
                diff={diff?.capacityFactorPct}
                compareLabel={compareLabel}
              />
              {effectiveDelta ? (
                <Row
                  label="Estimate vs engineering"
                  value={`${effectiveDelta.delta_kwh.toLocaleString()} kWh${
                    effectiveDelta.delta_pct !== null
                      ? ` (${effectiveDelta.delta_pct}%)`
                      : ""
                  }`}
                />
              ) : null}
            </div>
          ) : physicsSimulation ? (
            <ErrorState
              title="Engineering check failed."
              message={
                physicsSimulation.error ??
                physicsSimulation.reason ??
                "Engineering check unavailable."
              }
              className="min-h-0"
            />
          ) : (
            <EmptyState
              title="No engineering data."
              description="Engineering check did not return values."
            />
          )}
        </div>
      </div>
    </BentoTile>
  );
}

function Stat({
  label,
  value,
  subBadge,
  className,
}: {
  label: string;
  value: string;
  subBadge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className="data-label">{label}</p>
      <p className="text-base font-semibold tabular-nums tracking-tight">{value}</p>
      {subBadge}
    </div>
  );
}

function Row({
  label,
  value,
  diff,
  compareLabel,
}: {
  label: string;
  value: string;
  diff?: MetricDiff | null;
  compareLabel?: string;
}) {
  return (
    <div className="data-row">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
        <span className="data-value">{value}</span>
        {diff ? (
          <InlineDiffBadge diff={diff} compact compareLabel={compareLabel} />
        ) : null}
      </span>
    </div>
  );
}
