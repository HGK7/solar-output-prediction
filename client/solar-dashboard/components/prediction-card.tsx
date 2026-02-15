"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun,
  TrendingUp,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Info,
  Satellite,
} from "lucide-react";
import type { PredictionResult, DataProvenance } from "@/types";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  isLoading: boolean;
  dataProvenance?: DataProvenance | null;
}

export function PredictionCard({ prediction, isLoading, dataProvenance }: PredictionCardProps) {
  const [showMethodology, setShowMethodology] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  const ctx = prediction.prediction_context;
  const confidenceColor =
    prediction.metrics.r2 > 0.8
      ? "text-green-600"
      : prediction.metrics.r2 > 0.6
        ? "text-amber-600"
        : "text-red-500";

  return (
    <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-400" />
          Solar Output Prediction
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {prediction.model_used.replace("_", " ")}
          </Badge>
          {ctx && (
            <Badge
              variant="outline"
              className="text-xs gap-1"
            >
              {ctx.data_source === "nasa_api" ? (
                <Satellite className="h-3 w-3" />
              ) : (
                <Database className="h-3 w-3" />
              )}
              {ctx.data_source === "nasa_api" ? "NASA API" : "Manual"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main prediction value */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-amber-500">
            {prediction.prediction.toFixed(2)}
          </span>
          <span className="text-lg text-muted-foreground">{prediction.unit}</span>
        </div>

        {/* What this prediction means */}
        {ctx && (
          <div className="rounded-lg bg-sky-50/60 p-3 border border-sky-200/40 space-y-1.5">
            <p className="text-xs font-medium text-sky-700 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              What This Means
            </p>
            <p className="text-xs text-sky-600/80 leading-relaxed">
              {ctx.what_is_predicted}
            </p>
            <p className="text-xs text-sky-500/80 leading-relaxed">
              {ctx.prediction_represents}
            </p>
          </div>
        )}

        {/* Error estimate */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span>
            ± {prediction.error_estimate.toFixed(3)} {prediction.unit} uncertainty
          </span>
        </div>

        {/* Model metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg bg-white/50 p-3 border border-white/30">
            <p className="text-xs text-muted-foreground">Model R²</p>
            <p className={`text-lg font-semibold ${confidenceColor}`}>
              {(prediction.metrics.r2 * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-white/50 p-3 border border-white/30">
            <p className="text-xs text-muted-foreground">RMSE</p>
            <p className="text-lg font-semibold">
              {prediction.metrics.rmse.toFixed(3)}
            </p>
          </div>
        </div>

        {/* Input features */}
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-sky-400" />
            Input Features
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(prediction.input_features).map(([name, detail]) => (
              <div
                key={name}
                className="rounded-md bg-white/40 px-3 py-1.5 text-sm border border-white/20"
              >
                <span className="text-muted-foreground">{name}:</span>{" "}
                <span className="font-medium">
                  {detail.value} {detail.unit}
                </span>
              </div>
            ))}
          </div>
          {ctx && (
            <p className="text-xs text-muted-foreground/80 italic">
              Source: {ctx.data_source_detail}
            </p>
          )}
        </div>

        {/* Data provenance (from NASA) */}
        {dataProvenance && (
          <div className="space-y-2 pt-2 border-t border-white/30">
            <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
              <Satellite className="h-3.5 w-3.5 text-sky-400" />
              Data Source
            </p>
            <div className="text-xs text-muted-foreground/80 space-y-0.5">
              <p><span className="font-medium">Source:</span> {dataProvenance.source}</p>
              <p><span className="font-medium">Period:</span> {dataProvenance.date_range}</p>
              <p><span className="font-medium">Resolution:</span> {dataProvenance.spatial_resolution}</p>
              <p><span className="font-medium">Origin:</span> {dataProvenance.data_origin}</p>
            </div>
          </div>
        )}

        {/* Expandable methodology section */}
        {ctx && (
          <div className="pt-2 border-t border-white/30">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="font-medium">Methodology & Training Data</span>
              {showMethodology ? (
                <ChevronUp className="h-3.5 w-3.5 ml-auto" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-auto" />
              )}
            </button>
            {showMethodology && (
              <div className="mt-2 rounded-lg bg-white/60 p-4 border border-white/30 text-xs text-muted-foreground/90 space-y-2">
                <p className="leading-relaxed">{ctx.methodology}</p>
                <div className="space-y-0.5">
                  <p className="font-medium text-muted-foreground">Training Data:</p>
                  <p>Dataset: {ctx.training_data.dataset}</p>
                  <p>Target: {ctx.training_data.target_variable}</p>
                  <p>Source: {ctx.training_data.source}</p>
                  <p>Features: {ctx.training_data.features_used.join(", ")}</p>
                </div>
                {dataProvenance && (
                  <div className="space-y-0.5 pt-1 border-t border-white/20">
                    <p className="font-medium text-muted-foreground">Citation:</p>
                    <p className="italic">{dataProvenance.citation}</p>
                    <p className="font-medium text-muted-foreground pt-1">Limitations:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {dataProvenance.limitations.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
