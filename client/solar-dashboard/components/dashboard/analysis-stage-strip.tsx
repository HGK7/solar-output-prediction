"use client";

import { CheckCircle2, Circle, Loader2, MinusCircle } from "lucide-react";
import { PALETTE } from "@/context/zenith-preferences-context";
import { RichTooltip } from "@/components/ui/rich-tooltip";
import { isAnalysisInFlight } from "@/lib/planner-results-view";
import type { StreamingState } from "@/lib/use-streaming-analysis";

type StageStatus = "done" | "running" | "waiting" | "unavailable";

const STATUS_TEXT: Record<StageStatus, string> = {
  done: "Done",
  running: "In progress",
  waiting: "Waiting",
  unavailable: "Not available",
};

/** Which parts of an analysis run have finished, shown in the order they run. */
export function AnalysisStageStrip({ analysis }: { analysis: StreamingState }) {
  const running = isAnalysisInFlight(analysis);
  const noteFailed = Boolean(analysis.explanation?.error);
  const stages = [
    { term: "stage_climate", label: "Climate data", done: Boolean(analysis.monthly || analysis.annualAverages) },
    { term: "stage_sunlight", label: "Sunlight estimate", done: Boolean(analysis.prediction) },
    { term: "stage_engineering", label: "Engineering check", done: Boolean(analysis.physicsSimulation) },
    { term: "stage_money", label: "Costs and savings", done: Boolean(analysis.financial) },
    { term: "stage_layout", label: "Panel layout", done: Boolean(analysis.geometry) },
    { term: "stage_note", label: "Written explanation", done: Boolean(analysis.explanation) && !noteFailed, failed: noteFailed },
  ];
  const firstOpen = stages.findIndex((s) => !s.done && !s.failed);

  const statusOf = (s: (typeof stages)[number], i: number): StageStatus => {
    if (s.done) return "done";
    if (s.failed) return "unavailable";
    if (!running) return "unavailable";
    return i === firstOpen ? "running" : "waiting";
  };

  const heading = running
    ? "Analysis in progress. Results appear below as each part finishes."
    : analysis.stage === "error"
      ? "The analysis stopped before finishing."
      : "Analysis complete.";

  return (
    <div className={`border-b px-6 py-3 ${PALETTE.well} ${PALETTE.rule}`}>
      <p role="status" aria-live="polite" className="mb-2 text-xs font-medium">
        {heading}
      </p>
      <ol className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {stages.map((s, i) => {
          const status = statusOf(s, i);
          return (
            <li key={s.term} className="flex items-center gap-1.5">
              {status === "done" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden />
              ) : status === "running" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" aria-hidden />
              ) : status === "unavailable" ? (
                <MinusCircle className="h-3.5 w-3.5 text-[#A1A1AA]" aria-hidden />
              ) : (
                <Circle className="h-3.5 w-3.5 text-[#A1A1AA]" aria-hidden />
              )}
              <RichTooltip termKey={s.term} showUnderline={false}>
                {s.label}
              </RichTooltip>
              <span className={PALETTE.subInk}>· {STATUS_TEXT[status]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
