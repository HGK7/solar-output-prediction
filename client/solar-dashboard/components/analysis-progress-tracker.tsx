"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle } from "lucide-react";
import type { LoadingStage } from "@/types";

const PIPELINE_STEPS: Array<{ key: LoadingStage; label: string; detail: string }> = [
  { key: "location", label: "Data check", detail: "Load local climate averages and monthly values." },
  { key: "prediction", label: "Energy estimate", detail: "Estimate solar output for this location." },
  { key: "physics", label: "Engineering check", detail: "Cross-check with system physics." },
  { key: "financial", label: "Cost & savings", detail: "Estimate costs, savings, and payback." },
  { key: "explanation", label: "Explanation", detail: "Summarize the key drivers and sources." },
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
  variant?: "card" | "flat";
  showSources?: boolean;
  showHeader?: boolean;
}

export function AnalysisProgressTracker({
  stage,
  documents = [],
  errorMessage,
  variant = "card",
  showSources = true,
  showHeader = true,
}: AnalysisProgressTrackerProps) {
  const currentOrder = STAGE_ORDER[stage] ?? 0;
  const progress = stage === "complete" ? 100 : stage === "error" ? 0 : (currentOrder / 6) * 100;
  const stageLabel = stage === "idle" ? "Ready" : stage === "complete" ? "Complete" : stage === "error" ? "Error" : PIPELINE_STEPS.find((s) => s.key === stage)?.label ?? "";
  const stageTone = stage === "error" ? "error" : stage === "complete" ? "complete" : stage === "idle" ? "idle" : "active";

  const header = showHeader ? (
    <div className="flex items-center justify-between gap-3">
      <CardTitle className="text-base">Live progress</CardTitle>
      <Badge
        variant="outline"
        className={`text-xs ${stageTone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : stageTone === "complete"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : stageTone === "idle"
              ? "border-slate-200 bg-slate-50 text-slate-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
      >
        {stageLabel || "Ready"}
      </Badge>
    </div>
  ) : null;

  const body = (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid gap-2">
        {PIPELINE_STEPS.map((step) => {
          const stepOrder = STAGE_ORDER[step.key];
          const isActive = stage === step.key;
          const isComplete = stage === "complete" || (currentOrder > stepOrder && stage !== "error");
          const dotClass = isComplete
            ? "bg-emerald-500"
            : isActive
              ? "bg-amber-400 animate-pulse"
              : "bg-muted";

          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2 transition-colors ${isActive
                ? "border-amber-200 bg-amber-50/60"
                : isComplete
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-white/60 bg-white/70"
                }`}
            >
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`} />
              <div>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showSources && documents.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/60 bg-white/70 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4 text-amber-600" />
            Sources in use
          </div>
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <Badge
                key={doc}
                variant="secondary"
                className="text-xs bg-amber-100/60 text-amber-900 border-amber-200"
              >
                {doc.replace(".md", "")}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200/70 bg-red-50/70 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </>
  );

  if (variant === "flat") {
    return (
      <div className="space-y-4">
        {header}
        {body}
      </div>
    );
  }

  return (
    <Card className="glass-card border-amber-200/40 bg-linear-to-br from-amber-50/40 via-white/90 to-sky-50/45">
      {header && <CardHeader className="pb-2">{header}</CardHeader>}
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
