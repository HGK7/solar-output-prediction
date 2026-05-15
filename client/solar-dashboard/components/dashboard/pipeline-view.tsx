import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnalysisProgressTracker } from "@/components/analysis-progress-tracker";
import type { LoadingStage } from "@/types";

interface PipelineViewProps {
  stage: LoadingStage;
  documents: string[];
  errorMessage?: string;
  canViewResults: boolean;
  onViewResults: () => void;
}

export function PipelineView({
  stage,
  documents,
  errorMessage,
  canViewResults,
  onViewResults,
}: PipelineViewProps) {
  return (
    <section className="space-y-6">
      <CardTitle className="text-lg">Live progress</CardTitle>

      <AnalysisProgressTracker
        stage={stage}
        documents={documents}
        errorMessage={errorMessage}
        variant="flat"
        showSources={false}
        showHeader={false}
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          className="bg-amber-400 text-foreground hover:bg-amber-500"
          onClick={onViewResults}
          disabled={!canViewResults}
        >
          View results
        </Button>
      </div>
    </section>
  );
}
