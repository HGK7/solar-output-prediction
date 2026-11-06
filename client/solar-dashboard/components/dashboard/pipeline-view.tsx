"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisProgressTracker } from "@/components/analysis-progress-tracker";
import { BentoGrid, BentoTile } from "@/components/bento";
import type { StreamingState } from "@/lib/use-streaming-analysis";
import type { LoadingStage } from "@/types";

const STAGE_ORDER: Record<LoadingStage, number> = {
  idle: 0,
  location: 1,
  prediction: 2,
  physics: 3,
  financial: 4,
  explanation: 5,
  complete: 6,
  error: 0,
};

interface PipelineViewProps {
  stage: LoadingStage;
  documents: string[];
  errorMessage?: string;
  canViewResults: boolean;
  onViewResults: () => void;
  analysis: Pick<
    StreamingState,
    | "prediction"
    | "financial"
    | "explanation"
    | "monthly"
    | "physicsSimulation"
    | "annualAverages"
  >;
}

function StageTile({
  unlocked,
  title,
  description,
  children,
}: {
  unlocked: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <BentoTile title={title} description={description} className="min-h-[140px]">
      <AnimatePresence mode="wait">
        {unlocked ? (
          <motion.div
            key="content"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="skeleton"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
          </motion.div>
        )}
      </AnimatePresence>
    </BentoTile>
  );
}

export function PipelineView({
  stage,
  documents,
  errorMessage,
  canViewResults,
  onViewResults,
  analysis,
}: PipelineViewProps) {
  const currentOrder = STAGE_ORDER[stage] ?? 0;

  const isUnlocked = (step: LoadingStage) =>
    stage === "complete" ||
    currentOrder > STAGE_ORDER[step] ||
    !!(step === "location" && (analysis.monthly || analysis.annualAverages)) ||
    !!(step === "prediction" && analysis.prediction) ||
    !!(step === "physics" && analysis.physicsSimulation) ||
    !!(step === "financial" && analysis.financial) ||
    !!(step === "explanation" && analysis.explanation);

  return (
    <section className="space-y-4">
      <AnalysisProgressTracker
        stage={stage}
        documents={documents}
        errorMessage={errorMessage}
        variant="hero"
        showSources={false}
      />

      <BentoGrid>
        <StageTile
          unlocked={isUnlocked("location")}
          title="Climate data"
          description="Local averages and monthly inputs."
        >
          {analysis.annualAverages ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Temperature:{" "}
                <span className="font-medium text-foreground">
                  {analysis.annualAverages.Temperature?.toFixed(1)} °C
                </span>
              </p>
              <p>
                Irradiance:{" "}
                <span className="font-medium text-foreground">
                  {analysis.annualAverages["Clear Sky Irradiance"]?.toFixed(2)} kWh/m²/day
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Monthly series loaded.</p>
          )}
        </StageTile>

        <StageTile
          unlocked={isUnlocked("prediction")}
          title="Energy estimate"
          description="Model output for this site."
        >
          {analysis.prediction ? (
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {analysis.prediction.prediction}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {analysis.prediction.unit ?? "kWh/m²/day"}
              </span>
            </p>
          ) : null}
        </StageTile>

        <StageTile
          unlocked={isUnlocked("physics")}
          title="Engineering check"
          description="Physics cross-check."
        >
          {analysis.physicsSimulation ? (
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className="font-medium capitalize text-foreground">
                {analysis.physicsSimulation.status}
              </span>
              {typeof analysis.physicsSimulation.annual_energy_kwh === "number" ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-medium text-foreground">
                    {analysis.physicsSimulation.annual_energy_kwh.toLocaleString()} kWh/yr
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </StageTile>

        <StageTile
          unlocked={isUnlocked("financial")}
          title="Cost and savings"
          description="Financial summary."
        >
          {analysis.financial ? (
            <div className="space-y-1 text-sm">
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                ${analysis.financial.annual_savings_usd?.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground"> /yr saved</span>
              </p>
              <p className="text-muted-foreground">
                Payback:{" "}
                <span className="font-medium text-foreground">
                  {analysis.financial.simple_payback_years} years
                </span>
              </p>
            </div>
          ) : null}
        </StageTile>

        <BentoTile
          colSpan={4}
          title="Explanation"
          description="Source-backed summary."
          variant="ai"
          className="min-h-[120px]"
        >
          <AnimatePresence mode="wait">
            {isUnlocked("explanation") && analysis.explanation ? (
              <motion.p
                key="explain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm leading-relaxed text-muted-foreground line-clamp-4"
              >
                {analysis.explanation.explanation_summary}
              </motion.p>
            ) : (
              <motion.div
                key="explain-skel"
                initial={false}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </motion.div>
            )}
          </AnimatePresence>
        </BentoTile>
      </BentoGrid>

      <div className="flex justify-center pt-2">
        <Button onClick={onViewResults} disabled={!canViewResults}>
          View results
        </Button>
      </div>
    </section>
  );
}
