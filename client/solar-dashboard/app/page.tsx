"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Compass,
  DatabaseZap,
  FileText,
  MapPin,
  ShieldCheck,
  SunMedium,
  TriangleAlert,
} from "lucide-react";
import { motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const FEATURES = [
  {
    title: "Site review",
    description: "Enter the location, setup, and system size to frame the analysis.",
    icon: MapPin,
  },
  {
    title: "Output model",
    description: "Review expected production, savings, and payback in one place.",
    icon: DatabaseZap,
  },
  {
    title: "Source trace",
    description: "See what was calculated, what was retrieved, and where assumptions sit.",
    icon: ShieldCheck,
  },
] as const;

const WORKFLOW = ["Location", "Prediction", "Finance", "Explain"];

const FEATURE_CARDS = [
  {
    title: "Fast setup",
    description: "Move from a site to a result with a simple form and a clear flow.",
    icon: Compass,
  },
  {
    title: "Readable analysis",
    description: "Keep the chart, the summary, and the assumptions visible together.",
    icon: BarChart3,
  },
  {
    title: "Grounded context",
    description: "Use solar references to keep the explanation aligned with the result.",
    icon: FileText,
  },
];

function RevealCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-12% 0px -12% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function DashboardPreview() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(previewRef, { once: true, margin: "-18% 0px -18% 0px" });
  const [chartProgress, setChartProgress] = useState(0);
  const [outputValue, setOutputValue] = useState(0);
  const [paybackValue, setPaybackValue] = useState(0);

  const monthlyTargets = useMemo(() => [32, 41, 48, 44, 60, 72, 64, 58, 66, 70, 62, 54], []);

  useEffect(() => {
    if (!isInView) {
      return;
    }

    const startTime = Date.now();
    const duration = 1200;
    let frameId = 0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setChartProgress(eased);
      setOutputValue(Math.round(1248 * eased));
      setPaybackValue(Number((4.2 * eased).toFixed(1)));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isInView]);

  return (
    <div ref={previewRef} className="relative mx-auto w-full max-w-xl lg:ml-auto lg:mr-0 lg:mt-8 lg:pr-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-r from-amber-100/80 via-white to-sky-100/70" />

        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Dashboard preview</p>
              <p className="text-lg font-semibold text-foreground">Almeria South Field</p>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
              24.8% gain
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-border/70 bg-background/90 shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Monthly output</span>
                  <span>kWh</span>
                </div>
                <div className="flex h-28 items-end gap-2">
                  {monthlyTargets.map((height, index) => (
                    <motion.div
                      key={`${height}-${index}`}
                      className="flex-1 rounded-t-lg bg-linear-to-t from-amber-500 via-amber-300 to-sky-300"
                      initial={{ height: "24%", opacity: 0.5 }}
                      animate={isInView ? { height: `${24 + height * chartProgress * 0.76}%`, opacity: 1 } : { height: "24%", opacity: 0.5 }}
                      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.035 }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card className="border-border/70 bg-background/90 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Expected output</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{outputValue.toLocaleString()} kWh</p>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-background/90 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Estimated payback</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{paybackValue.toFixed(1)} years</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border/70 bg-background/90 shadow-none">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assumptions</p>
                <div className="space-y-2 text-sm text-foreground">
                  <div className="flex items-center justify-between">
                    <span>System size</span>
                    <span className="font-medium">42 kW</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Panel efficiency</span>
                    <span className="font-medium">22.8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Annual savings</span>
                    <span className="font-medium">$18,400</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/90 shadow-none">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trace</p>
                <div className="space-y-2 text-sm text-foreground">
                  <div className="flex items-center justify-between">
                    <span>NASA data</span>
                    <span className="font-medium">Used</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>RAG docs</span>
                    <span className="font-medium">Linked</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Financial model</span>
                    <span className="font-medium">Ready</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function HomePage() {
  return (
    <div className="h-full overflow-hidden bg-linear-to-br from-yellow-50 via-sky-50 to-white">
      <ScrollArea className="app-shell-scroll h-full">
        <main className="flex min-h-full w-full flex-col pb-12 md:pb-16 lg:pb-20">
          <header className="border-b border-border/50 bg-white/70 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-sm shadow-amber-200/50">
                  <SunMedium className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Zenith</p>
                  <p className="text-xs text-muted-foreground">Solar portfolio planning.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="hidden text-xs sm:inline-flex">
                  <Link href="/about">About</Link>
                </Button>
                {/**
                 * Auth entry points are intentionally disabled until account creation is wired up.
                 * <Button asChild variant="outline" className="text-xs">
                 *   <Link href="/login">Sign In</Link>
                 * </Button>
                 */}
                <Button asChild className="bg-amber-400 text-foreground shadow-sm shadow-amber-200/50 hover:bg-amber-500">
                  <Link href="/dashboard">
                    View Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </header>

          <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
            <RevealCard>
              <div className="space-y-6">
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Alpha</Badge>

                <div className="space-y-3">
                  <h1 className="max-w-3xl text-4xl font-black tracking-tight text-foreground md:text-6xl">
                    Optimize your solar portfolio.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                    Analyse, plan and optimize your Solar Portfolio with a clear workflow for site review, production estimates, financial checks and source-backed context.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="bg-amber-400 text-foreground shadow-sm shadow-amber-200/60 hover:bg-amber-500">
                    <Link href="/dashboard">
                      Analyse now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/about">About the project</Link>
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {FEATURES.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.06 }}
                      >
                        <Card className="glass-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
                          <CardContent className="space-y-2 p-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                              <Icon className="h-4 w-4" />
                            </div>
                            <p className="text-base font-semibold text-foreground">{feature.title}</p>
                            <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </RevealCard>

            <motion.div
              initial={{ opacity: 0, x: 28, rotate: 0 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              className="relative"
            >
              <DashboardPreview />
            </motion.div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-4 py-2 md:px-6 lg:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {FEATURE_CARDS.map((card, index) => {
                const Icon = card.icon;
                return (
                  <RevealCard key={card.title} delay={index * 0.05}>
                    <Card className="glass-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-amber-600 shadow-sm">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-base font-semibold text-foreground">{card.title}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>
                      </CardContent>
                    </Card>
                  </RevealCard>
                );
              })}
            </div>
          </section>

          <footer className="border-t border-border/50 bg-white/70">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
              <p>
                Developed by{" "}
                <a href="https://hgk-portfolio.vercel.app/" target="_blank" rel="noreferrer" className="text-foreground transition-colors hover:text-amber-600">
                  Hrishikesh
                </a>
              </p>
              <div className="flex items-center gap-4">
                <Link href="/" className="hover:text-foreground">Home</Link>
                <Link href="/about" className="hover:text-foreground">About</Link>
                <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
              </div>
            </div>
          </footer>
        </main>
      </ScrollArea>
    </div>
  );
}
