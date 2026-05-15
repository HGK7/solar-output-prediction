"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, AlertTriangle, BookOpen, Sparkles, Calculator, Link as LinkIcon } from "lucide-react";
import type { ExplanationResponse } from "@/types";

interface ExplanationPanelProps {
  explanation: ExplanationResponse | null;
  isLoading: boolean;
}

export function ExplanationPanel({ explanation, isLoading }: ExplanationPanelProps) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </CardContent>
      </Card>
    );
  }

  if (!explanation || explanation.error) return null;

  const confidenceBadgeClass =
    explanation.confidence_assessment === "high"
      ? "bg-green-50 text-green-700 border-green-200"
      : explanation.confidence_assessment === "low"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  const keyDrivers = explanation.key_drivers?.slice(0, 3) ?? [];
  const risks = explanation.risk_factors?.slice(0, 3) ?? [];
  const citations = explanation.citations?.slice(0, 4) ?? [];
  const calculations = explanation.calculation_trace?.slice(0, 3) ?? [];
  const methodology = explanation.methodology_trace ?? [];
  const inputTrace = explanation.input_trace ?? [];
  const assumptions = explanation.assumptions_used ?? [];
  const ragPipeline = explanation.rag_pipeline;

  return (
    <Card className="glass-card border-sky-200/50 bg-linear-to-br from-sky-50/35 via-white/90 to-amber-50/35">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-violet-500" />
          Explanation
        </CardTitle>
        <Badge variant="outline" className={confidenceBadgeClass}>
          {explanation.confidence_assessment} confidence
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="trace">Steps</TabsTrigger>
            <TabsTrigger value="evidence">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="rounded-xl border border-amber-100/70 bg-white/80 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1 inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Executive summary
              </p>
              <p className="text-base text-foreground/85 leading-relaxed">{explanation.explanation_summary}</p>
            </div>

            <Separator className="bg-amber-100/80" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ReportBlock title="Physical interpretation" content={explanation.physical_interpretation} />
              <ReportBlock title="Financial insight" content={explanation.financial_insight ?? "Insufficient information"} />
            </div>

            {keyDrivers.length > 0 && (
              <div className="rounded-xl border border-sky-100/70 bg-white/80 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Key drivers</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {keyDrivers.map((driver, index) => (
                    <div
                      key={`${driver.feature}-${index}`}
                      className="rounded-lg border border-white/60 bg-white/70 px-2.5 py-2"
                    >
                      <p className="text-xs text-muted-foreground truncate">{driver.feature}</p>
                      <p className="text-base font-semibold">{driver.value} {driver.unit}</p>
                      <p className="text-sm text-foreground/75 line-clamp-2">{driver.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="bg-sky-100/80" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ReportBlock title="Uncertainty" content={explanation.uncertainty_notes || "Insufficient information"} />
              <div className="rounded-xl border border-red-100/70 bg-white/80 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Top risks
                </p>
                {risks.length > 0 ? (
                  <ul className="space-y-1.5 text-sm text-foreground/80">
                    {risks.map((risk, idx) => (
                      <li key={`risk-${idx}`}>- {risk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No major risk factors reported.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trace" className="space-y-4">
            {methodology.length > 0 ? (
              <div className="rounded-xl border border-amber-100/70 bg-white/80 p-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">How this was calculated</p>
                <div className="space-y-2">
                  {methodology.map((item, index) => (
                    <div key={`${item.step}-${index}`} className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                      <p className="text-sm font-semibold text-foreground">{item.step}</p>
                      <p className="text-xs text-muted-foreground">{item.how}</p>
                      <p className="text-xs text-muted-foreground">{item.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ReportBlock title="How this was calculated" content="No step-by-step details reported." />
            )}

            {inputTrace.length > 0 && (
              <div className="rounded-xl border border-sky-100/70 bg-white/80 p-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Inputs used</p>
                <div className="grid grid-cols-1 gap-2">
                  {inputTrace.slice(0, 6).map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.value} - {item.source}</p>
                      <p className="text-xs text-muted-foreground">{item.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {calculations.length > 0 && (
              <div className="rounded-xl border border-violet-100/70 bg-white/80 p-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1.5">
                  <Calculator className="h-4 w-4" /> Key calculations
                </p>
                <div className="space-y-2">
                  {calculations.map((calc, index) => (
                    <div key={`${calc.step}-${index}`} className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                      <p className="text-sm font-semibold text-foreground">{calc.step}</p>
                      <p className="text-sm text-foreground/80">{calc.result}</p>
                      {calc.formula && <p className="text-xs text-muted-foreground">{calc.formula}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assumptions.length > 0 && (
              <div className="rounded-xl border border-amber-100/70 bg-white/80 p-3">
                <p className="text-sm font-medium text-muted-foreground">Assumptions</p>
                <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                  {assumptions.slice(0, 5).map((item, index) => (
                    <li key={`${item}-${index}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="evidence" className="space-y-4">
            {explanation.grounded_context && (
              <div className="rounded-xl border border-sky-100/70 bg-white/80 p-3 space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Background
                </p>
                <p className="text-base text-foreground/80 leading-relaxed">{explanation.grounded_context}</p>
              </div>
            )}

            {ragPipeline && (
              <div className="rounded-xl border border-blue-100/70 bg-white/80 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Sources used</p>
                  <Badge variant="outline" className="text-xs">
                    {ragPipeline.retrieval_count} sources
                  </Badge>
                </div>

                {ragPipeline.query && (
                  <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Search phrase</p>
                    <p className="text-sm text-foreground/85 leading-relaxed">{ragPipeline.query}</p>
                  </div>
                )}

                {ragPipeline.retrieved_documents?.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {ragPipeline.retrieved_documents.slice(0, 3).map((doc, idx) => (
                      <div key={`${doc.source}-${idx}`} className="rounded-lg border border-white/60 bg-white/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{doc.source}</p>
                          {doc.link && (
                            <a
                              href={doc.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sky-700 inline-flex items-center gap-1 hover:underline"
                            >
                              <LinkIcon className="h-3.5 w-3.5" /> Source
                            </a>
                          )}
                        </div>
                        {doc.section && <p className="text-xs text-muted-foreground">{doc.section}</p>}
                        <p className="text-sm text-foreground/80 leading-relaxed mt-1">{doc.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {citations.map((citation, index) => (
                  citation.link ? (
                    <a
                      key={`${citation.source}-${citation.section ?? ""}-${index}`}
                      href={citation.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex"
                    >
                      <Badge variant="outline" className="text-xs hover:bg-sky-50">
                        {citation.source}
                        {citation.section ? ` (${citation.section})` : ""}
                      </Badge>
                    </a>
                  ) : (
                    <Badge
                      key={`${citation.source}-${citation.section ?? ""}-${index}`}
                      variant="outline"
                      className="text-xs"
                    >
                      {citation.source}
                      {citation.section ? ` (${citation.section})` : ""}
                    </Badge>
                  )
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ReportBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-xl border border-white/45 bg-linear-to-br from-white/85 to-sky-50/30 p-3">
      <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
      <p className="text-base text-foreground/80 leading-relaxed">{content}</p>
    </div>
  );
}
