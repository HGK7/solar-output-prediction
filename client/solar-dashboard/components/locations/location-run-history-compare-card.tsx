"use client";

import { useMemo } from "react";
import type { SavedAnalysisRun } from "@/types";
import type { RunSummaryDelta } from "@/lib/run-summary-delta";
import { formatDelta } from "@/lib/run-summary-delta";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/bento";

function ComparisonBar({
  baseValue,
  compareValue,
  delta,
  deltaUnit,
  formatAsCurrency = false,
  invertTone = false,
}: {
  baseValue: number;
  compareValue: number;
  delta: number;
  deltaUnit: string;
  formatAsCurrency?: boolean;
  invertTone?: boolean;
}) {
  const max = Math.max(baseValue, compareValue, 0.0000001);
  const basePct = (baseValue / max) * 100;
  const comparePct = (compareValue / max) * 100;

  const good = invertTone ? delta < 0 : delta > 0;
  const bad = invertTone ? delta > 0 : delta < 0;

  const formatValue = (value: number) => {
    if (formatAsCurrency) return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const deltaText = formatDelta(delta, deltaUnit);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Base</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatValue(baseValue)}
          </p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-xs text-muted-foreground">Compare</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatValue(compareValue)}
          </p>
        </div>
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-tile-inset">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-tile-border/70"
          style={{ width: `${basePct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/35"
          style={{ width: `${comparePct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="text-muted-foreground">Delta</p>
        <p
          className={[
            "font-semibold tabular-nums",
            good && "text-status-ok",
            bad && "text-status-error",
            !good && !bad && "text-muted-foreground",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {deltaText}
        </p>
      </div>
    </div>
  );
}

export interface LocationRunHistoryCompareCardProps {
  locationRuns: SavedAnalysisRun[];
  baseRunId: string;
  compareRunId: string;
  onBaseRunIdChange: (id: string) => void;
  onCompareRunIdChange: (id: string) => void;
  runDelta: RunSummaryDelta | null;
}

export function LocationRunHistoryCompareCard({
  locationRuns,
  baseRunId,
  compareRunId,
  onBaseRunIdChange,
  onCompareRunIdChange,
  runDelta,
}: LocationRunHistoryCompareCardProps) {
  const runs = useMemo(
    () =>
      [...locationRuns].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [locationRuns],
  );

  const latestRun = runs[0] ?? null;
  const baseRun = runs.find((r) => r.id === baseRunId) ?? null;
  const compareRun = runs.find((r) => r.id === compareRunId) ?? null;

  if (!runs.length) {
    return (
      <Card className="rounded-2xl border-tile-border bg-tile shadow-sm">
        <CardHeader>
          <CardTitle>Run history</CardTitle>
          <CardDescription>Saved runs for this location.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No saved analysis run."
            description="Run analysis on dashboard and save this location."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-tile-border bg-tile shadow-sm">
      <CardHeader>
        <CardTitle>Run history</CardTitle>
        <CardDescription>Compare two configurations with inline deltas.</CardDescription>
      </CardHeader>
      <CardContent>
        {latestRun ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold">Latest run</p>
                <p className="text-xs text-muted-foreground">
                  Saved {new Date(latestRun.createdAt).toLocaleString()} ·{" "}
                  {new Date(latestRun.createdAt).toUTCString()} (UTC)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Confidence: {latestRun.summary.confidence}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  Model: {latestRun.summary.modelUsed.replaceAll("_", " ")}
                </Badge>
                <Badge variant="outline">Runs: {runs.length}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base run</Label>
                <Select value={baseRunId} onValueChange={onBaseRunIdChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select run" />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {new Date(run.createdAt).toLocaleString()} ·{" "}
                        {new Date(run.createdAt).toUTCString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Compare run</Label>
                <Select value={compareRunId} onValueChange={onCompareRunIdChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select run" />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {new Date(run.createdAt).toLocaleString()} ·{" "}
                        {new Date(run.createdAt).toUTCString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {baseRun && compareRun && runDelta ? (
              <div className="space-y-4 rounded-xl border border-tile-border bg-tile-inset p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Annual output
                    </p>
                    <ComparisonBar
                      baseValue={baseRun.summary.annualOutputKwh}
                      compareValue={compareRun.summary.annualOutputKwh}
                      delta={runDelta.annualOutputKwh}
                      deltaUnit="kWh/yr"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Annual savings
                    </p>
                    <ComparisonBar
                      baseValue={baseRun.summary.annualSavingsUsd}
                      compareValue={compareRun.summary.annualSavingsUsd}
                      delta={runDelta.annualSavingsUsd}
                      deltaUnit="USD/yr"
                      formatAsCurrency
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Payback
                    </p>
                    <ComparisonBar
                      baseValue={baseRun.summary.paybackYears}
                      compareValue={compareRun.summary.paybackYears}
                      delta={runDelta.paybackYears}
                      deltaUnit="yr"
                      invertTone
                    />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Select two runs."
                description="Pick a base run and a compare run to see deltas."
                className="min-h-0"
              />
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-tile-border bg-tile-inset p-3">
                <p className="text-xs text-muted-foreground">Latest output</p>
                <p className="text-lg font-semibold">
                  {latestRun.summary.annualOutputKwh.toLocaleString()} kWh
                </p>
              </div>
              <div className="rounded-xl border border-tile-border bg-tile-inset p-3">
                <p className="text-xs text-muted-foreground">Latest savings</p>
                <p className="text-lg font-semibold">
                  ${latestRun.summary.annualSavingsUsd.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-tile-border bg-tile-inset p-3">
                <p className="text-xs text-muted-foreground">Latest payback</p>
                <p className="text-lg font-semibold">
                  {latestRun.summary.paybackYears} years
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

