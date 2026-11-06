"use client";

import { Progress } from "@/components/ui/progress";
import { BentoTile } from "@/components/bento";
import { Check, FileText } from "lucide-react";
import { SourceDocumentTrigger } from "@/components/source-document-trigger";
import { resolveSourceFilename } from "@/lib/source-documents";
import { cn } from "@/lib/utils";
import type { LoadingStage } from "@/types";

const PIPELINE_STEPS: Array<{ key: LoadingStage; label: string }> = [
  { key: "location", label: "Location" },
  { key: "prediction", label: "Output" },
  { key: "physics", label: "Engineering" },
  { key: "financial", label: "Finance" },
  { key: "explanation", label: "Explanation" },
];

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

interface AnalysisProgressTrackerProps {
  stage: LoadingStage;
  documents?: string[];
  errorMessage?: string;
  variant?: "card" | "flat" | "hero";
  showSources?: boolean;
  showHeader?: boolean;
}

export function AnalysisProgressTracker({
  stage,
  documents = [],
  errorMessage,
  variant = "card",
  showSources = true,
}: AnalysisProgressTrackerProps) {
  const currentOrder = STAGE_ORDER[stage] ?? 0;
  const progress =
    stage === "complete" ? 100 : stage === "error" ? 0 : (currentOrder / 6) * 100;
  const hasError = stage === "error" || !!errorMessage;

  const body = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE_STEPS.map((step, index) => {
          const stepOrder = STAGE_ORDER[step.key];
          const isActive = stage === step.key;
          const isComplete =
            stage === "complete" || (currentOrder > stepOrder && stage !== "error");

          return (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive && "stage-pill-active border-primary bg-primary/5 text-foreground",
                  isComplete && !isActive && "border-status-ok/40 bg-status-ok/5 text-foreground",
                  !isActive && !isComplete && "border-tile-border bg-tile-inset text-muted-foreground",
                )}
              >
                {isComplete ? (
                  <Check className="size-3.5 text-status-ok" aria-hidden />
                ) : (
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      isActive ? "bg-primary" : "bg-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                )}
                <span>{step.label}</span>
              </div>
              {index < PIPELINE_STEPS.length - 1 ? (
                <span className="hidden text-muted-foreground/50 sm:inline" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {showSources && documents.length > 0 ? (
        <div className="bento-tile-inset space-y-2 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="size-4 text-primary" />
            Sources in use
          </div>
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) =>
              resolveSourceFilename(doc) ? (
                <SourceDocumentTrigger key={doc} source={doc} />
              ) : (
                <span
                  key={doc}
                  className="rounded-full border border-tile-border bg-background px-2 py-0.5 text-xs"
                >
                  {doc.replace(".md", "")}
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );

  if (variant === "flat") {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <BentoTile
      colSpan={4}
      title="Live progress"
      className={cn(hasError && "border-destructive ring-1 ring-destructive/30")}
    >
      {body}
    </BentoTile>
  );
}
