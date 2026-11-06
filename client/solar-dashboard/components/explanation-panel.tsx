"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BentoTile, DegradedBanner, StatusBadge } from "@/components/bento";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  Calculator,
  Sparkles,
} from "lucide-react";
import { SourceDocumentTrigger } from "@/components/source-document-trigger";
import type { ExplanationResponse } from "@/types";
import { cn } from "@/lib/utils";

interface ExplanationPanelProps {
  explanation: ExplanationResponse | null;
  isLoading: boolean;
  /** Tighter typography and spacing on results stack. */
  compact?: boolean;
}

export function ExplanationPanel({
  explanation,
  isLoading,
  compact = false,
}: ExplanationPanelProps) {
  const [tab, setTab] = useState("summary");
  const reduceMotion = useReducedMotion();
  const resizeEase = [0.16, 1, 0.3, 1] as const;
  const resizeTransition = reduceMotion
    ? { duration: 0 }
    : {
        layout: { duration: 0.4, ease: resizeEase },
        opacity: { duration: 0.22, ease: resizeEase },
      };

  if (isLoading) {
    return (
      <BentoTile variant="ai" title="Explanation" icon={<BrainCircuit className="size-4" />}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-32 w-full" />
        </div>
      </BentoTile>
    );
  }

  if (!explanation) return null;

  if (explanation.error) {
    return (
      <BentoTile variant="ai" title="Explanation" icon={<BrainCircuit className="size-4" />}>
        <DegradedBanner message={explanation.error} />
      </BentoTile>
    );
  }

  const confidence = explanation.confidence_assessment;
  const confidenceStatus: "ok" | "warn" | "error" =
    confidence === "high" ? "ok" : confidence === "low" ? "error" : "warn";

  const keyDrivers = explanation.key_drivers?.slice(0, 3) ?? [];
  const risks = explanation.risk_factors?.slice(0, 3) ?? [];
  const citations = explanation.citations?.slice(0, 4) ?? [];
  const calculations = explanation.calculation_trace?.slice(0, 3) ?? [];
  const methodology = explanation.methodology_trace ?? [];
  const inputTrace = explanation.input_trace ?? [];
  const assumptions = explanation.assumptions_used ?? [];
  const ragPipeline = explanation.rag_pipeline;

  const tabBodyClass = cn(compact ? "space-y-3" : "space-y-5");

  return (
    <BentoTile
      variant="ai"
      title="Explanation"
      icon={<BrainCircuit className="size-4" />}
      action={<StatusBadge status={confidenceStatus} label={`${confidence} confidence`} />}
      className="overflow-visible"
    >
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex w-full flex-col gap-3"
      >
        <TabsList
          aria-label="Explanation sections"
          className="grid h-8 w-full shrink-0 grid-cols-3"
        >
          <TabsTrigger value="summary" className="text-xs">
            Summary
          </TabsTrigger>
          <TabsTrigger value="trace" className="text-xs">
            Steps
          </TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs">
            Sources
          </TabsTrigger>
        </TabsList>

        <motion.div layout transition={resizeTransition} className="overflow-hidden">
          <TabsContent value="summary" className="mt-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key="summary"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={resizeTransition}
                className={tabBodyClass}
              >
                <Section
                  eyebrow="Executive summary"
                  icon={<Sparkles className="size-3.5" aria-hidden />}
                >
                  <p
                    className={cn(
                      "leading-relaxed text-foreground",
                      compact ? "text-sm" : "text-base",
                    )}
                  >
                    {explanation.explanation_summary}
                  </p>
                </Section>

                {!compact ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Block title="Physical interpretation" content={explanation.physical_interpretation} />
                    <Block
                      title="Financial insight"
                      content={explanation.financial_insight ?? "Insufficient information."}
                    />
                  </div>
                ) : null}

                {keyDrivers.length > 0 ? (
                  <Section eyebrow="Key drivers">
                    <div className="space-y-0">
                      {keyDrivers.map((driver, index) => (
                        <div
                          key={`${driver.feature}-${index}`}
                          className="data-row gap-4"
                        >
                          <span className="min-w-0 flex-1 text-sm text-foreground">
                            {driver.feature}
                          </span>
                          <span className="data-value shrink-0">
                            {driver.value} {driver.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    {!compact ? (
                      <div className="space-y-1.5 pt-2">
                        {keyDrivers.map((driver, index) => (
                          <p
                            key={`impact-${index}`}
                            className="text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="text-foreground/80">{driver.feature}.</span>{" "}
                            {driver.impact}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </Section>
                ) : null}

                <div className={cn("grid gap-4", !compact && "lg:grid-cols-2")}>
                  <Block
                    title="Uncertainty"
                    content={explanation.uncertainty_notes || "Insufficient information."}
                  />
                  <Section
                    eyebrow="Top risks"
                    icon={<AlertTriangle className="size-3.5" aria-hidden />}
                  >
                    {risks.length > 0 ? (
                      <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/85">
                        {risks.map((risk, idx) => (
                          <li key={`risk-${idx}`} className="flex gap-2">
                            <span className="text-muted-foreground" aria-hidden>
                              ·
                            </span>
                            <span className="min-w-0">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No major risk factors reported.
                      </p>
                    )}
                  </Section>
                </div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="trace" className="mt-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key="trace"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={resizeTransition}
                className={tabBodyClass}
              >
                {methodology.length > 0 ? (
                  <Section eyebrow="Calculation steps">
                    <div className="space-y-2">
                      {methodology.map((item, index) => (
                        <TilePanel key={`${item.step}-${index}`}>
                          <p className="text-sm font-medium text-foreground">{item.step}</p>
                          <p className="text-sm text-muted-foreground">{item.how}</p>
                          <p className="text-xs text-muted-foreground/85">{item.why}</p>
                        </TilePanel>
                      ))}
                    </div>
                  </Section>
                ) : (
                  <Block title="Calculation steps" content="No step-by-step details reported." />
                )}

                {inputTrace.length > 0 ? (
                  <Section eyebrow="Inputs">
                    <div className="space-y-2">
                      {inputTrace.slice(0, 6).map((item, index) => (
                        <TilePanel key={`${item.name}-${index}`}>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.value} from {item.source}
                          </p>
                          <p className="text-xs text-muted-foreground/85">{item.impact}</p>
                        </TilePanel>
                      ))}
                    </div>
                  </Section>
                ) : null}

                {calculations.length > 0 ? (
                  <Section
                    eyebrow="Key calculations"
                    icon={<Calculator className="size-3.5" aria-hidden />}
                  >
                    <div className="space-y-2">
                      {calculations.map((calc, index) => (
                        <TilePanel key={`${calc.step}-${index}`}>
                          <p className="text-sm font-medium text-foreground">{calc.step}</p>
                          <p className="text-sm tabular-nums text-foreground/85">{calc.result}</p>
                          {calc.formula ? (
                            <p className="font-mono text-xs text-muted-foreground">
                              {calc.formula}
                            </p>
                          ) : null}
                        </TilePanel>
                      ))}
                    </div>
                  </Section>
                ) : null}

                {assumptions.length > 0 ? (
                  <Section eyebrow="Assumptions">
                    <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/85">
                      {assumptions.slice(0, 5).map((item, index) => (
                        <li key={`${index}`} className="flex gap-2">
                          <span className="text-muted-foreground" aria-hidden>
                            ·
                          </span>
                          <span className="min-w-0">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="evidence" className="mt-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key="evidence"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={resizeTransition}
                className={tabBodyClass}
              >
                {explanation.grounded_context ? (
                  <Section
                    eyebrow="Background"
                    icon={<BookOpen className="size-3.5" aria-hidden />}
                  >
                    <p className="text-base leading-relaxed text-foreground/90">
                      {explanation.grounded_context}
                    </p>
                  </Section>
                ) : null}

                {ragPipeline ? (
                  <Section eyebrow={`Sources used (${ragPipeline.retrieval_count})`}>
                    {ragPipeline.query ? (
                      <TilePanel>
                        <p className="data-label">Search phrase</p>
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {ragPipeline.query}
                        </p>
                      </TilePanel>
                    ) : null}

                    {ragPipeline.retrieved_documents?.length > 0 ? (
                      <div className="space-y-2">
                        {ragPipeline.retrieved_documents.slice(0, 3).map((doc, idx) => (
                          <TilePanel key={`${doc.source}-${idx}`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {doc.source}
                              </p>
                              <SourceDocumentTrigger
                                source={doc.source}
                                sourcePath={doc.source_path}
                                excerpt={doc.snippet}
                                variant="link"
                              />
                            </div>
                            {doc.section ? (
                              <p className="text-xs text-muted-foreground">{doc.section}</p>
                            ) : null}
                            <p className="text-sm leading-relaxed text-foreground/85">
                              {doc.snippet}
                            </p>
                          </TilePanel>
                        ))}
                      </div>
                    ) : null}
                  </Section>
                ) : null}

                {citations.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {citations.map((citation, index) => (
                      <SourceDocumentTrigger
                        key={`${citation.source}-${citation.section ?? ""}-${index}`}
                        source={citation.source}
                        sourcePath={citation.source_path}
                        label={
                          citation.section
                            ? `${citation.source} (${citation.section})`
                            : citation.source
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </motion.div>
      </Tabs>
    </BentoTile>
  );
}

function Section({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="data-label inline-flex items-center gap-1.5">
        {icon}
        {eyebrow}
      </p>
      {children}
    </div>
  );
}

function Block({ title, content }: { title: string; content: string }) {
  return (
    <div className="space-y-1.5">
      <p className="data-label">{title}</p>
      <p className="text-sm leading-relaxed text-foreground/85">{content}</p>
    </div>
  );
}

function TilePanel({ children }: { children: React.ReactNode }) {
  return <div className="tile-panel space-y-1.5">{children}</div>;
}
