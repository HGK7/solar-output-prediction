"use client";

import { BentoTile, StatusBadge } from "@/components/bento";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, Satellite, Database } from "lucide-react";
import type { PredictionResult, DataProvenance } from "@/types";
import { cn } from "@/lib/utils";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  dataProvenance?: DataProvenance | null;
  compact?: boolean;
}

export function PredictionCard({
  prediction,
  isLoading,
  dataProvenance,
  compact = false,
}: PredictionCardProps) {
  if (isLoading) {
    return (
      <BentoTile title="Output estimate" icon={<Sun className="size-4" />}>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-12 w-44" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      </BentoTile>
    );
  }

  if (!prediction) return null;

  const r2 = prediction.metrics.r2;
  const confidenceStatus: "ok" | "warn" | "error" =
    r2 > 0.8 ? "ok" : r2 > 0.6 ? "warn" : "error";
  const confidenceLabel =
    r2 > 0.8 ? "High confidence" : r2 > 0.6 ? "Medium confidence" : "Low confidence";

  const topDrivers = Object.entries(prediction.feature_importance)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 3);

  return (
    <BentoTile
      title="Output estimate"
      icon={<Sun className="size-4" />}
      action={<StatusBadge status={confidenceStatus} label={confidenceLabel} />}
    >
      <div className={cn("flex flex-col", compact ? "gap-3" : "gap-5")}>
        <div className={compact ? "space-y-1" : "metric-hero"}>
          <p className="data-label">Estimated irradiance</p>
          <p
            className={cn(
              "font-semibold tabular-nums tracking-tight text-foreground",
              compact ? "text-3xl leading-none" : "metric-hero-value",
            )}
          >
            {prediction.prediction.toFixed(2)}{" "}
            <span className="metric-hero-unit">{prediction.unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Uncertainty ± {prediction.error_estimate.toFixed(3)} {prediction.unit}
          </p>
        </div>

        <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-3 gap-4")}>
          <KeyValue label="Accuracy" value={`${(r2 * 100).toFixed(1)}%`} compact={compact} />
          <KeyValue
            label="Typical error"
            value={prediction.metrics.rmse.toFixed(3)}
            compact={compact}
          />
          {!compact ? (
            <KeyValue
              label="Model"
              value={prediction.model_used.replace(/_/g, " ")}
              valueClass="capitalize"
            />
          ) : null}
        </div>

        {!compact && topDrivers.length > 0 ? (
          <div className="space-y-2">
            <p className="data-label">Top drivers</p>
            <div className="space-y-0">
              {topDrivers.map(([feature, weight]) => (
                <div key={feature} className="data-row">
                  <span className="text-sm text-foreground/85">{feature}</span>
                  <span className="data-value">{weight.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!compact && (prediction.prediction_context || dataProvenance) ? (
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
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
        ) : null}
      </div>
    </BentoTile>
  );
}

function KeyValue({
  label,
  value,
  valueClass,
  compact,
}: {
  label: string;
  value: string;
  valueClass?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="data-label">{label}</p>
      <p
        className={cn(
          "font-semibold tabular-nums tracking-tight",
          compact ? "text-base" : "text-lg",
          valueClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}
