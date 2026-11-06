"use client";

import { useEffect, useState } from "react";
import { BentoTile } from "@/components/bento";
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
  const [loadError, setLoadError] = useState(false);

  const systemParameters = financial?.system_parameters;

  useEffect(() => {
    if (!prediction || !systemParameters) {
      setRecommendations([]);
      setLoadError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);

    getRecommendations({
      predictedIrradianceKwhM2Day: prediction.prediction,
      financialOverrides: {
        region: systemParameters.region,
        system_capacity_kw: systemParameters.capacity_kw,
        panel_efficiency: systemParameters.panel_efficiency,
        performance_ratio: systemParameters.performance_ratio,
        electricity_tariff_usd: systemParameters.electricity_tariff_usd_kwh,
      },
      lat,
      lon,
    })
      .then((response) => {
        if (!cancelled) setRecommendations(response.recommendations);
      })
      .catch(() => {
        if (!cancelled) {
          setRecommendations([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prediction, systemParameters, lat, lon]);

  if (!prediction || !financial) return null;

  return (
    <BentoTile title="Recommendations" icon={<Lightbulb className="size-4" />}>
      {isLoading && recommendations.length === 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-muted-foreground">
          Recommendations unavailable. Try again after re-running analysis.
        </p>
      ) : recommendations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No specific recommendations for this configuration.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {recommendations.map((rec) => {
            const Icon = ICONS[rec.id] ?? Lightbulb;
            return (
              <div key={rec.id} className="tile-panel space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5 shrink-0 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">{rec.title}</h4>
                </div>
                <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">
                  {rec.detail}
                </p>
                <SourceDocumentTrigger source={rec.source_document} />
              </div>
            );
          })}
        </div>
      )}
    </BentoTile>
  );
}
