"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BentoGrid, BentoGridCell } from "@/components/bento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OutputEngineeringCard } from "@/components/output-engineering-card";
import { FinancialCard } from "@/components/financial-card";
import { OutputChart } from "@/components/output-chart";
import { ExplanationPanel } from "@/components/explanation-panel";
import { WhatIfPanel } from "@/components/what-if-panel";
import { RecommendationsCard } from "@/components/recommendations-card";
import { computeFullRunDiff } from "@/lib/run-summary-delta";
import type { StreamingState } from "@/lib/use-streaming-analysis";
import type { SystemConfig } from "@/components/system-config-panel";
import type { SavedAnalysisRun } from "@/types";

interface ResultsViewProps {
  analysis: StreamingState;
  lat: number | null;
  lon: number | null;
  systemConfig?: SystemConfig;
  previousRun?: SavedAnalysisRun | null;
  reanalysisLocationName?: string | null;
  locationsCount: number;
  saveDialogOpen: boolean;
  saveName: string;
  /** Re-analysis preset: save without asking for "Location name" again. */
  skipSaveNamePrompt?: boolean;
  canSaveAnalysis: boolean;
  effectiveDelta: {
    delta_kwh: number;
    delta_pct: number | null;
  } | null;
  saveStatus: string | null;
  onSaveDialogChange: (nextOpen: boolean) => void;
  onSaveNameChange: (nextValue: string) => void;
  onSave: () => void;
  onAnalyzeNewLocation: () => void;
  onOpenLocations: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function ResultsView({
  analysis,
  lat,
  lon,
  systemConfig,
  previousRun = null,
  reanalysisLocationName = null,
  locationsCount,
  saveDialogOpen,
  saveName,
  skipSaveNamePrompt = false,
  canSaveAnalysis,
  effectiveDelta,
  saveStatus,
  onSaveDialogChange,
  onSaveNameChange,
  onSave,
  onAnalyzeNewLocation,
  onOpenLocations,
}: ResultsViewProps) {
  const handleSave = () => {
    const valid = skipSaveNamePrompt
      ? canSaveAnalysis
      : canSaveAnalysis && saveName.trim().length > 0;
    if (!valid) return;
    onSave();
    toast.success(
      skipSaveNamePrompt
        ? `Saved new run to ${reanalysisLocationName ?? "site"}`
        : "Analysis saved",
    );
  };

  const fullDiff = useMemo(() => {
    if (!previousRun || !analysis.prediction || !analysis.financial) {
      return null;
    }

    const fallbackConfig = systemConfig ?? previousRun.systemConfig;
    const currentRunPreview: SavedAnalysisRun = {
      id: "preview-run",
      createdAt: new Date().toISOString(),
      systemConfig: fallbackConfig,
      summary: {
        annualOutputKwh: analysis.financial.annual_output_kwh,
        annualSavingsUsd: analysis.financial.annual_savings_usd,
        paybackYears: analysis.financial.simple_payback_years,
        confidence: analysis.explanation?.confidence_assessment ?? "medium",
        modelUsed: analysis.prediction.model_used,
      },
      result: {
        prediction: analysis.prediction,
        financial: analysis.financial,
        explanation:
          analysis.explanation ?? {
            explanation_summary: "",
            key_drivers: [],
            physical_interpretation: "",
            uncertainty_notes: "",
            risk_factors: [],
            confidence_assessment: "medium",
            financial_insight: null,
          },
        geometry: analysis.geometry ?? undefined,
        monthly: analysis.monthly ?? undefined,
        data_provenance: analysis.dataProvenance ?? undefined,
        physics_simulation: analysis.physicsSimulation ?? undefined,
        ml_vs_physics_delta: analysis.mlVsPhysicsDelta ?? undefined,
      },
    };

    return computeFullRunDiff(previousRun, currentRunPreview);
  }, [
    previousRun,
    analysis.prediction,
    analysis.financial,
    analysis.explanation,
    analysis.geometry,
    analysis.monthly,
    analysis.dataProvenance,
    analysis.physicsSimulation,
    analysis.mlVsPhysicsDelta,
    systemConfig,
  ]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {previousRun ? (
            <Badge variant="outline" className="mr-1 font-mono text-[11px]">
              Re-analysis · Δ vs. previous run ({reanalysisLocationName ?? "saved site"})
            </Badge>
          ) : null}
          {analysis.activeDocuments.length > 0 ? (
            <>
              <span className="mr-1 text-xs text-muted-foreground">Sources</span>
              {analysis.activeDocuments.map((doc) => (
                <Badge
                  key={doc}
                  variant="secondary"
                  className="rounded-full px-2 py-0 text-[10px] font-normal"
                >
                  {doc.replace(".md", "")}
                </Badge>
              ))}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onAnalyzeNewLocation}>
            New location
          </Button>
          {skipSaveNamePrompt ? (
            <Button size="sm" disabled={!canSaveAnalysis} onClick={handleSave}>
              Save run to {reanalysisLocationName ?? "site"}
            </Button>
          ) : (
            <Drawer
              open={saveDialogOpen}
              onOpenChange={onSaveDialogChange}
              direction="right"
            >
              <DrawerTrigger asChild>
                <Button size="sm" disabled={!canSaveAnalysis}>
                  Save
                </Button>
              </DrawerTrigger>
              <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
                <DrawerHeader>
                  <DrawerTitle>Name this analysis</DrawerTitle>
                </DrawerHeader>
                <div className="grid gap-2 px-4">
                  <Label htmlFor="save-analysis-name">Location name</Label>
                  <Input
                    id="save-analysis-name"
                    placeholder="Home Rooftop"
                    value={saveName}
                    onChange={(event) => onSaveNameChange(event.target.value)}
                  />
                  {saveStatus ? (
                    <p className="text-sm text-muted-foreground">{saveStatus}</p>
                  ) : null}
                </div>
                <DrawerFooter>
                  <Button
                    onClick={handleSave}
                    disabled={!saveName.trim() || !canSaveAnalysis}
                  >
                    Save
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/locations" onClick={onOpenLocations}>
              Locations ({locationsCount})
            </Link>
          </Button>
        </div>
      </div>

      <BentoGrid className="results-bento">
        <BentoGridCell index={0} className="lg:col-span-2">
          <OutputEngineeringCard
            prediction={analysis.prediction}
            physicsSimulation={analysis.physicsSimulation}
            isPredictionLoading={
              analysis.stage === "location" || analysis.stage === "prediction"
            }
            isEngineeringLoading={analysis.stage === "physics"}
            dataProvenance={analysis.dataProvenance}
            effectiveDelta={effectiveDelta}
            diff={fullDiff}
            compareLabel="Previous run"
          />
        </BentoGridCell>

        <BentoGridCell index={1} stretch className="lg:col-span-2 lg:self-stretch">
          <FinancialCard
            financial={analysis.financial}
            geometry={analysis.geometry}
            isLoading={
              analysis.stage === "location" ||
              analysis.stage === "prediction" ||
              analysis.stage === "physics" ||
              analysis.stage === "financial"
            }
            dense
            fillHeight
            diff={fullDiff}
            compareLabel="Previous run"
          />
        </BentoGridCell>

        <BentoGridCell index={2} className="lg:col-span-4">
          <OutputChart
            monthly={analysis.monthly}
            isLoading={analysis.stage === "location"}
            wide
          />
        </BentoGridCell>

        <BentoGridCell index={3} className="lg:col-span-4">
          <RecommendationsCard
            prediction={analysis.prediction}
            financial={analysis.financial}
            lat={lat}
            lon={lon}
          />
        </BentoGridCell>

        <BentoGridCell index={4} className="lg:col-span-4">
          <WhatIfPanel
            prediction={analysis.prediction}
            baseline={analysis.financial}
            compact
          />
        </BentoGridCell>

        <BentoGridCell index={5} className="lg:col-span-4">
          <ExplanationPanel
            explanation={analysis.explanation}
            isLoading={
              analysis.stage === "location" ||
              analysis.stage === "prediction" ||
              analysis.stage === "financial" ||
              analysis.stage === "explanation"
            }
            compact
          />
        </BentoGridCell>
      </BentoGrid>
    </section>
  );
}
