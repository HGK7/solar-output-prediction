import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { PredictionCard } from "@/components/prediction-card";
import { FinancialCard } from "@/components/financial-card";
import { OutputChart } from "@/components/output-chart";
import { ExplanationPanel } from "@/components/explanation-panel";
import type { StreamingState } from "@/lib/use-streaming-analysis";

interface ResultsViewProps {
  analysis: StreamingState;
  locationsCount: number;
  saveDialogOpen: boolean;
  saveName: string;
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
  locationsCount,
  saveDialogOpen,
  saveName,
  canSaveAnalysis,
  effectiveDelta,
  saveStatus,
  onSaveDialogChange,
  onSaveNameChange,
  onSave,
  onAnalyzeNewLocation,
  onOpenLocations,
}: ResultsViewProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Analysis results</h2>
        <p className="text-sm text-muted-foreground">Output, costs, and explanation in one view.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onAnalyzeNewLocation}>Analyze new location</Button>

        <Dialog open={saveDialogOpen} onOpenChange={onSaveDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-amber-400 text-foreground hover:bg-amber-500" disabled={!canSaveAnalysis}>
              Save analysis
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Name this analysis</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="save-analysis-name">Location name</Label>
              <Input
                id="save-analysis-name"
                placeholder="e.g., Home Rooftop - Jaipur"
                value={saveName}
                onChange={(event) => onSaveNameChange(event.target.value)}
              />
            </div>
            {saveStatus && <p className="text-sm text-muted-foreground">{saveStatus}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onSaveDialogChange(false)}>Cancel</Button>
              <Button
                className="bg-amber-400 text-foreground hover:bg-amber-500"
                onClick={onSave}
                disabled={!saveName.trim() || !canSaveAnalysis}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button asChild variant="outline">
          <Link href="/locations" onClick={onOpenLocations}>Open locations ({locationsCount})</Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="mx-auto max-w-5xl">
          <OutputChart monthly={analysis.monthly} isLoading={analysis.stage === "location"} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PredictionCard
            prediction={analysis.prediction}
            isLoading={analysis.stage === "location" || analysis.stage === "prediction"}
            dataProvenance={analysis.dataProvenance}
          />
          <FinancialCard
            financial={analysis.financial}
            geometry={analysis.geometry}
            isLoading={
              analysis.stage === "location" ||
              analysis.stage === "prediction" ||
              analysis.stage === "physics" ||
              analysis.stage === "financial"
            }
          />
        </div>

        {(analysis.physicsSimulation || analysis.stage === "physics") && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Engineering check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {analysis.stage === "physics" && !analysis.physicsSimulation ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running the engineering check...
                </div>
              ) : analysis.physicsSimulation?.status === "ok" ? (
                <>
                  <p>
                    Annual Energy: <span className="font-medium text-foreground">{analysis.physicsSimulation.annual_energy_kwh?.toLocaleString()} kWh</span>
                  </p>
                  <p>
                    Capacity Factor: <span className="font-medium text-foreground">{analysis.physicsSimulation.capacity_factor_pct}%</span>
                  </p>
                  {effectiveDelta && (
                    <p>
                      Estimate vs engineering delta: <span className="font-medium text-foreground">{effectiveDelta.delta_kwh.toLocaleString()} kWh</span>
                      {effectiveDelta.delta_pct !== null && (
                        <span className="font-medium text-foreground"> ({effectiveDelta.delta_pct}%)</span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-red-600">
                  {analysis.physicsSimulation?.error ?? analysis.physicsSimulation?.reason ?? "Engineering check unavailable."}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <ExplanationPanel
          explanation={analysis.explanation}
          isLoading={
            analysis.stage === "location" ||
            analysis.stage === "prediction" ||
            analysis.stage === "financial" ||
            analysis.stage === "explanation"
          }
        />

        {analysis.activeDocuments.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sources used</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {analysis.activeDocuments.map((doc) => (
                <Badge
                  key={doc}
                  variant="secondary"
                  className="text-xs bg-amber-100/60 text-amber-900 border-amber-200"
                >
                  {doc.replace(".md", "")}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
