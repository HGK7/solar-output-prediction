"use client";

"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenText, DatabaseZap, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DOC_SECTIONS = [
  {
    title: "Purpose",
    description:
      "The retrieval corpus gives the app a grounded explanation layer for solar fundamentals, weather impacts, costs, panel efficiency, and site-specific context.",
  },
  {
    title: "Inputs",
    description:
      "NASA climatology supplies location averages, the ML model estimates irradiance, and the financial layer converts that estimate into savings and payback.",
  },
  {
    title: "Explanation",
    description:
      "The LLM is not used to invent output. It explains the deterministic result and points back to retrieved documents when relevant.",
  },
  {
    title: "Limits",
    description:
      "This MVP is honest about missing data, seasonal variance, and the fact that estimates are not guarantees.",
  },
];

const DOCUMENTS = [
  "Solar fundamentals",
  "Weather impact notes",
  "Solar cost references",
  "Panel efficiency guidance",
  "Site and technical reference material",
  "PV model technical references",
];

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-full bg-linear-to-br from-sky-50 via-yellow-50 to-white">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-8 pb-24 md:px-6 md:pb-28 lg:px-8 lg:pb-32">
        <div className="space-y-6 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" className="border-border/60 bg-white/70 hover:bg-white">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button asChild className="bg-amber-400 text-foreground hover:bg-amber-500">
              <Link href="/dashboard">
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Transparency</Badge>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
              About the planner
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              This planner helps you review a site, assess expected output, and understand the assumptions behind the result. The focus is on practical analysis, readable output, and clear source tracing.
            </p>
          </div>
        </div>

        <div className="grid gap-4 pb-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <Card className="glass-card">
              <CardHeader className="space-y-2 border-b border-border/50 bg-white/40">
                <div className="flex items-center gap-2 text-amber-600">
                  <BookOpenText className="h-5 w-5" />
                  <CardTitle className="text-2xl">Stack</CardTitle>
                </div>
                <CardDescription>
                  Prediction, financial analysis, geometry, and explanation are kept separate so each part can be checked independently.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  {DOC_SECTIONS.map((section, index) => (
                    <Reveal key={section.title} delay={index * 0.05}>
                      <div className="rounded-xl border border-border/60 bg-white/75 p-4 transition-transform duration-200 hover:-translate-y-1">
                        <h2 className="font-semibold text-foreground">{section.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <Separator />

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-background/80 p-4 transition-transform duration-200 hover:-translate-y-1">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <DatabaseZap className="h-4 w-4 text-sky-500" />
                      Data
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      NASA climatology, monthly solar values, and saved browser state provide the current inputs.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/80 p-4 transition-transform duration-200 hover:-translate-y-1">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Reasoning
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Deterministic models compute the numbers, and the LLM explains them with grounded context.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/80 p-4 transition-transform duration-200 hover:-translate-y-1">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Trust
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Explanations show what was retrieved, what was calculated, and what remains uncertain.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="glass-card">
              <CardHeader className="space-y-2 border-b border-border/50 bg-white/40">
                <div className="flex items-center gap-2 text-amber-600">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-2xl">Documents</CardTitle>
                </div>
                <CardDescription>
                  These sources keep the explanation grounded in solar knowledge instead of letting it improvise.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-2">
                  {DOCUMENTS.map((document, index) => (
                    <motion.div
                      key={document}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
                      className="flex items-center gap-2 rounded-lg bg-background/80 px-3 py-2 text-sm text-foreground"
                    >
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <span>{document}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  The explanation stays readable while still making it clear that the response is grounded in retrieved references, not generic chatbot output.
                </div>

                <div className="rounded-xl border border-border/60 bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
                  Current behavior:
                  <ul className="mt-2 space-y-2 pl-4">
                    <li>• Use local browser memory for preferences and saved state.</li>
                    <li>• Compute estimates from deterministic models and financial rules.</li>
                    <li>• Use RAG to explain, cite, and qualify results.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}