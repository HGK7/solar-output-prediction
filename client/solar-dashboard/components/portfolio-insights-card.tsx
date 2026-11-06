"use client";

import { useState } from "react";
import { BentoTile, EmptyState, ErrorState } from "@/components/bento";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import {
  getPortfolioInsights,
  RAGUnavailableError,
  type PortfolioInsightsResponse,
  type PortfolioSitePayload,
} from "@/lib/api";

interface PortfolioInsightsCardProps {
  sites: PortfolioSitePayload[];
}

export function PortfolioInsightsCard({ sites }: PortfolioInsightsCardProps) {
  const [insights, setInsights] = useState<PortfolioInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sites.length < 2) {
    return (
      <BentoTile variant="ai" title="Portfolio insights" icon={<Sparkles className="size-4" />}>
        <EmptyState
          title="Not enough sites."
          description="Save at least two analyzed locations."
        />
      </BentoTile>
    );
  }

  const generate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setInsights(await getPortfolioInsights(sites));
    } catch (err) {
      setInsights(null);
      setError(
        err instanceof RAGUnavailableError
          ? "Insights service is offline on this deployment."
          : err instanceof Error
            ? err.message
            : "Portfolio insights failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BentoTile
      variant="ai"
      title="Portfolio insights"
      icon={<Sparkles className="size-4" />}
      action={
        <Button
          size="sm"
          onClick={generate}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {insights ? "Regenerate" : "Generate insights"}
        </Button>
      }
    >
      <div className="space-y-3">
        {error ? (
          <ErrorState
            title="Insights request failed."
            message={error}
            className="min-h-0"
          />
        ) : null}

        {!insights && !error && !isLoading && (
          <p className="text-sm text-muted-foreground">
            Compares your {sites.length} analyzed sites: best and worst
            performers, payback spread, and what drives the differences.
          </p>
        )}

        {insights && (
          <>
            <p className="text-sm font-medium text-foreground">
              {insights.summary}
            </p>
            {insights.highlights.length > 0 && (
              <ul className="space-y-1.5">
                {insights.highlights.map((highlight, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
            {insights.watchouts.length > 0 && (
              <div className="space-y-1.5">
                {insights.watchouts.map((watchout, i) => (
                  <p
                    key={i}
                    className="text-sm text-amber-700 bg-amber-50/70 border border-amber-200/60 rounded-lg px-3 py-2 flex items-start gap-2"
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    {watchout}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </BentoTile>
  );
}
