"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sun,
  AlertTriangle,
  Satellite,
  Database,
} from "lucide-react";
import type { PredictionResult, DataProvenance } from "@/types";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  dataProvenance?: DataProvenance | null;
}

export function PredictionCard({ prediction, isLoading, dataProvenance }: PredictionCardProps) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  const confidenceTone =
    prediction.metrics.r2 > 0.8
      ? "high"
      : prediction.metrics.r2 > 0.6
        ? "medium"
        : "low";

  const confidenceBadgeClass =
    confidenceTone === "high"
      ? "bg-green-50 text-green-700 border-green-200"
      : confidenceTone === "medium"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  const topDrivers = Object.entries(prediction.feature_importance)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 3);

  return (
    <Card className="glass-card border-amber-200/50 bg-linear-to-br from-amber-50/40 via-white/90 to-sky-50/45">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-400" />
          Output estimate
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {prediction.model_used.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className={`text-xs ${confidenceBadgeClass}`}>
            {confidenceTone} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ReportStat label="Estimated irradiance" value={`${prediction.prediction.toFixed(2)} ${prediction.unit}`} accent />
          <ReportStat
            label="Uncertainty"
            value={`± ${prediction.error_estimate.toFixed(3)} ${prediction.unit}`}
            icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          />
          <ReportStat label="Accuracy score" value={`${(prediction.metrics.r2 * 100).toFixed(1)}%`} />
          <ReportStat label="Typical error" value={prediction.metrics.rmse.toFixed(3)} />
        </div>

        <Separator className="bg-amber-100/80" />

        <div className="rounded-xl border border-sky-100/70 bg-white/80 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Top drivers</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {topDrivers.map(([feature, weight]) => (
              <div key={feature} className="rounded-lg border border-white/60 bg-white/70 px-2.5 py-2">
                <p className="text-xs text-muted-foreground truncate">{feature}</p>
                <p className="text-base font-semibold">{weight.toFixed(3)}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-sky-100/80" />

        <div className="rounded-xl border border-amber-100/70 bg-white/80 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Source summary</p>
          <p className="text-sm text-foreground/80">
            {prediction.prediction_context?.what_is_predicted ?? "Estimate shows average solar irradiance for the selected location."}
          </p>
          {prediction.prediction_context?.prediction_represents && (
            <p className="text-xs text-muted-foreground">
              {prediction.prediction_context.prediction_represents}
            </p>
          )}
          {prediction.prediction_context && (
            <p className="text-xs text-muted-foreground">
              {prediction.prediction_context.data_source === "nasa_api" ? (
                <span className="inline-flex items-center gap-1"><Satellite className="h-3.5 w-3.5" /> Satellite climate averages</span>
              ) : (
                <span className="inline-flex items-center gap-1"><Database className="h-3.5 w-3.5" /> Manual inputs</span>
              )}
            </p>
          )}
          {dataProvenance && (
            <p className="text-xs text-muted-foreground">
              {dataProvenance.source} - {dataProvenance.date_range}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportStat({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${accent
        ? "border-amber-200 bg-linear-to-br from-amber-50/70 to-yellow-50/45"
        : "border-white/45 bg-linear-to-br from-white/80 to-sky-50/35"
        }`}
    >
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
