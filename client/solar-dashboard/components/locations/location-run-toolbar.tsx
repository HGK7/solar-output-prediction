"use client";

import { ArrowLeftRight, GitCompare, History, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineDiffBadge } from "@/components/locations/inline-diff-badge";
import type { FullRunDiff } from "@/lib/run-summary-delta";
import type { SavedAnalysisRun } from "@/types";

export type RunViewMode = "single" | "compare";

interface LocationRunToolbarProps {
  /** Runs ordered newest-first, or any order (we compute chronological #N). */
  runs: SavedAnalysisRun[];
  mode: RunViewMode;
  onModeChange: (mode: RunViewMode) => void;
  baseRunId: string;
  compareRunId: string;
  onBaseRunIdChange: (id: string) => void;
  onCompareRunIdChange: (id: string) => void;
  onSwapRuns: () => void;
  onDeleteRun: (runId: string) => void;
  diff: FullRunDiff | null;
}

export function formatRunOptionLabel(
  run: SavedAnalysisRun,
  chronologicalNumber: number,
): string {
  const dateStr = new Date(run.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const capKw = run.systemConfig.systemCapacityKw.toFixed(1);
  const tech = run.systemConfig.panelTechnology.replaceAll("-", " ");
  const savings = `$${run.summary.annualSavingsUsd.toLocaleString()}/yr`;
  const customLabel = run.label ? `${run.label} · ` : "";
  return `Run #${chronologicalNumber} · ${customLabel}${dateStr} · ${capKw} kW · ${tech} · ${savings}`;
}

export function LocationRunToolbar({
  runs,
  mode,
  onModeChange,
  baseRunId,
  compareRunId,
  onBaseRunIdChange,
  onCompareRunIdChange,
  onSwapRuns,
  onDeleteRun,
  diff,
}: LocationRunToolbarProps) {
  if (runs.length === 0) return null;

  // Map each run ID to its chronological 1-based index (oldest = #1, newest = #N)
  const chronologicalOrder = [...runs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const runNumberById = new Map<string, number>();
  chronologicalOrder.forEach((r, idx) => {
    runNumberById.set(r.id, idx + 1);
  });

  const baseRun = runs.find((r) => r.id === baseRunId) ?? runs[0];
  const compareRun = runs.find((r) => r.id === compareRunId) ?? runs[1] ?? runs[0];
  const baseRunNum = runNumberById.get(baseRun.id) ?? 1;
  const compareRunNum = runNumberById.get(compareRun.id) ?? 1;

  const canCompare = runs.length >= 2;

  return (
    <section
      aria-label="Analysis run selector and comparison controls"
      className="space-y-3 rounded-xl border border-tile-border bg-tile p-4 shadow-xs"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Tabs
            value={mode}
            onValueChange={(next) => onModeChange(next as RunViewMode)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="single" className="gap-1.5 text-xs">
                <History className="size-3.5" aria-hidden />
                Single Run View
              </TabsTrigger>
              <TabsTrigger
                value="compare"
                disabled={!canCompare}
                className="gap-1.5 text-xs"
              >
                <GitCompare className="size-3.5" aria-hidden />
                Compare Runs (Inline Diffs)
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {!canCompare ? (
            <span className="text-xs text-muted-foreground">
              Save at least 2 runs to compare configurations.
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs tabular-nums">
            {runs.length} {runs.length === 1 ? "saved run" : "saved runs"}
          </Badge>
          {mode === "single" && runs.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDeleteRun(baseRun.id)}
              aria-label={`Delete Run #${baseRunNum}`}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete Run
            </Button>
          ) : null}
        </div>
      </div>

      {mode === "single" ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="single-run-select" className="text-xs text-muted-foreground">
              Selected analysis run
            </Label>
            <Select value={baseRun.id} onValueChange={onBaseRunIdChange}>
              <SelectTrigger id="single-run-select" className="w-full lg:max-w-xl">
                <SelectValue placeholder="Select a saved run" />
              </SelectTrigger>
              <SelectContent>
                {runs.map((run) => {
                  const num = runNumberById.get(run.id) ?? 1;
                  return (
                    <SelectItem key={run.id} value={run.id}>
                      {formatRunOptionLabel(run, num)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-xs tabular-nums">
              {baseRun.systemConfig.systemCapacityKw.toFixed(1)} kW
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {baseRun.systemConfig.panelTechnology.replaceAll("-", " ")}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {baseRun.systemConfig.installationType.replaceAll("-", " ")}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {baseRun.systemConfig.gridConnection.replaceAll("-", " ")}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs tabular-nums">
              ${baseRun.systemConfig.electricityTariffUsd}/kWh
            </Badge>
            <Badge variant="outline" className="font-mono text-xs tabular-nums">
              PR {(baseRun.systemConfig.performanceRatio * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="base-run-select" className="text-xs font-medium text-foreground">
                Base Run (shown on dashboard)
              </Label>
              <Select value={baseRun.id} onValueChange={onBaseRunIdChange}>
                <SelectTrigger id="base-run-select" className="w-full">
                  <SelectValue placeholder="Select base run" />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run) => {
                    const num = runNumberById.get(run.id) ?? 1;
                    return (
                      <SelectItem key={run.id} value={run.id}>
                        {formatRunOptionLabel(run, num)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSwapRuns}
              aria-label="Swap base run and compared run"
              className="h-9 gap-1.5 self-end"
            >
              <ArrowLeftRight className="size-3.5" aria-hidden />
              Swap
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="compare-run-select" className="text-xs font-medium text-foreground">
                Compared Run (shown as inline diffs)
              </Label>
              <Select value={compareRun.id} onValueChange={onCompareRunIdChange}>
                <SelectTrigger id="compare-run-select" className="w-full">
                  <SelectValue placeholder="Select compared run" />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run) => {
                    const num = runNumberById.get(run.id) ?? 1;
                    return (
                      <SelectItem key={run.id} value={run.id}>
                        {formatRunOptionLabel(run, num)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {diff ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-tile-border bg-tile-inset/70 px-3 py-2 text-xs">
              <span className="font-medium text-muted-foreground">
                Configuration changes (Run #{baseRunNum} → Run #{compareRunNum}):
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-md border border-tile-border bg-tile px-2 py-0.5 tabular-nums">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium text-foreground">
                  {diff.systemCapacityKw.baseVal.toFixed(1)} kW → {diff.systemCapacityKw.compareVal.toFixed(1)} kW
                </span>
                <InlineDiffBadge
                  diff={diff.systemCapacityKw}
                  compact
                  showPct={false}
                  compareLabel={`Run #${compareRunNum}`}
                />
              </span>

              {Math.abs(diff.electricityTariffUsd.delta) > 1e-5 ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-tile-border bg-tile px-2 py-0.5 tabular-nums">
                  <span className="text-muted-foreground">Tariff:</span>
                  <span className="font-medium text-foreground">
                    ${diff.electricityTariffUsd.baseVal}/kWh → ${diff.electricityTariffUsd.compareVal}/kWh
                  </span>
                  <InlineDiffBadge
                    diff={diff.electricityTariffUsd}
                    compact
                    showPct={false}
                    compareLabel={`Run #${compareRunNum}`}
                  />
                </span>
              ) : null}

              {Math.abs(diff.performanceRatio.delta) > 1e-4 ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-tile-border bg-tile px-2 py-0.5 tabular-nums">
                  <span className="text-muted-foreground">PR:</span>
                  <span className="font-medium text-foreground">
                    {(diff.performanceRatio.baseVal * 100).toFixed(0)}% → {(diff.performanceRatio.compareVal * 100).toFixed(0)}%
                  </span>
                </span>
              ) : null}

              {diff.panelTechnology.changed ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-tile-border bg-tile px-2 py-0.5 capitalize">
                  <span className="text-muted-foreground">Panel:</span>
                  <span className="font-medium text-foreground">
                    {diff.panelTechnology.baseVal.replaceAll("-", " ")} → {diff.panelTechnology.compareVal.replaceAll("-", " ")}
                  </span>
                </span>
              ) : null}

              {diff.installationType.changed ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-tile-border bg-tile px-2 py-0.5 capitalize">
                  <span className="text-muted-foreground">Mount:</span>
                  <span className="font-medium text-foreground">
                    {diff.installationType.baseVal.replaceAll("-", " ")} → {diff.installationType.compareVal.replaceAll("-", " ")}
                  </span>
                </span>
              ) : null}

              {diff.gridConnection.changed ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-tile-border bg-tile px-2 py-0.5 capitalize">
                  <span className="text-muted-foreground">Grid:</span>
                  <span className="font-medium text-foreground">
                    {diff.gridConnection.baseVal} → {diff.gridConnection.compareVal}
                  </span>
                </span>
              ) : null}

              {diff.modelUsed.changed ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-tile-border bg-tile px-2 py-0.5 capitalize">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium text-foreground">
                    {diff.modelUsed.baseVal.replaceAll("_", " ")} → {diff.modelUsed.compareVal.replaceAll("_", " ")}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
