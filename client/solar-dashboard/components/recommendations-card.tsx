"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Compass,
  Lightbulb,
  PlugZap,
  Wrench,
  TrendingUp,
} from "lucide-react";
import { SourceDocumentTrigger } from "@/components/source-document-trigger";
import { getRecommendations } from "@/lib/api";
import type {
  FinancialSummary,
  PredictionResult,
  Recommendation,
} from "@/types";

const ICONS: Record<string, typeof Compass> = {
  orientation: Compass,
  grid_parity: PlugZap,
  maintenance: Wrench,
  tariff_break_even: TrendingUp,
};

interface RecommendationsCardProps {
  prediction: PredictionResult | null;
  financial: FinancialSummary | null;
  lat: number | null;
  lon: number | null;
}

export function RecommendationsCard({
  prediction,
  financial,
  lat,
  lon,
}: RecommendationsCardProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const params = financial?.system_parameters;

  useEffect(() => {
    if (!prediction || !params) {
      setRecommendations([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getRecommendations({
      predictedIrradianceKwhM2Day: prediction.prediction,
      financialOverrides: {
        region: params.region,
        system_capacity_kw: params.capacity_kw,
        panel_efficiency: params.panel_efficiency,
        performance_ratio: params.performance_ratio,
        electricity_tariff_usd: params.electricity_tariff_usd_kwh,
      },
      lat,
      lon,
    })
      .then((response) => {
        if (!cancelled) setRecommendations(response.recommendations);
      })
      .catch(() => {
        if (!cancelled) setRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prediction, params, lat, lon]);

  if (!prediction || !financial) return null;
  if (!isLoading && recommendations.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Recommendations
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Computed deterministically from your prediction — sources open in the
          document viewer.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {isLoading && recommendations.length === 0 ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : (
          recommendations.map((rec) => {
            const Icon = ICONS[rec.id] ?? Lightbulb;
            return (
              <div
                key={rec.id}
                className="rounded-xl border border-white/40 bg-white/50 backdrop-blur-sm p-3.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                  <h4 className="text-sm font-medium">{rec.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rec.detail}
                </p>
                <SourceDocumentTrigger
                  source={rec.source_document}
                  className="bg-sky-50/50 text-sky-700 border-sky-200/50"
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
