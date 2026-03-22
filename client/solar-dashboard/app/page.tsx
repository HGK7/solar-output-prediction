"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChartColumn,
  CircleUserRound,
  Dot,
  Layers,
  LogIn,
  MapPin,
  Sparkles,
  Sun,
  Thermometer,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SolarArchiveFeed } from "@/components/SolarArchiveFeed";

const RSS_FEED_URL = "https://renewablesnow.com/news/news_feed/?source=solar";
const RSS_NEWS_PAGE_URL = "https://renewablesnow.com/news/solar/";

const NAV_ITEMS = [
  // Methodology and Data Sources are paused for MVP iteration and will return in final documentation.
  // { label: "Methodology", href: "#methodology" },
  // { label: "Data Sources", href: "#archive" },

  // API access, docs and other links are deferred until the post-MVP bibliography stage.
  // { label: "API Access", href: "/dashboard" },
  // { label: "Documentation", href: "#footer" },

  { label: "Dashboard", href: "/dashboard" },
];

const SCIENCE_CARDS = [
  {
    title: "Spectral Analysis",
    description:
      "Evaluates light spectrum distribution based on local atmospheric composition for panel selection.",
    value: "350-2500nm",
    sub: "Range monitored",
    icon: Layers,
  },
  {
    title: "Thermal Dynamics",
    description:
      "Predicts panel-level thermal response to reduce efficiency drop in harsh micro-climates.",
    value: "-0.34%/°C",
    sub: "Coefficient model",
    icon: Thermometer,
  },
  {
    title: "Albedo Tracking",
    description:
      "Accounts for ground reflectance to optimize bifacial panel orientation and mounting decisions.",
    value: "0.22 Avg",
    sub: "Surface reflectance",
    icon: MapPin,
  },
] as const;

export default function HomePage() {
  return (
    <div className="h-full overflow-hidden bg-[#f1f1f1]">
      <ScrollArea className="app-shell-scroll h-full">
        <main className="flex min-h-full w-full flex-col">
          <section className="border-b border-border/50 bg-white" id="top">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 font-semibold text-amber-500">
                  <Sun className="h-5 w-5" /> HELIOS
                </div>
                <nav className="hidden items-center gap-5 text-xs text-muted-foreground md:flex">
                  {NAV_ITEMS.map((item) => (
                    <a key={item.label} href={item.href} className="hover:text-foreground">
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="ghost" className="text-xs">
                  <Link href="/login">
                    <LogIn className="h-4 w-4" /> Login
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link href="/signup">
                    <UserPlus className="h-4 w-4" /> Create account
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-amber-400 text-foreground hover:bg-amber-500 text-xs">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="bg-[#f7f7f4]">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 md:grid-cols-2 md:px-10">
              <div className="space-y-6">
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Alpha</Badge>

                <div>
                  <h1 className="text-5xl font-black leading-tight text-foreground md:text-6xl">Precision Solar</h1>
                  <h1 className="text-5xl font-black italic leading-tight text-amber-500 md:text-6xl">Optimization</h1>
                </div>

                <p className="max-w-xl text-muted-foreground md:text-lg">
                  Optimize your solar installation with AI-powered analytics that combine irradiance data,
                  panel behavior, and financial intelligence.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="bg-amber-400 text-foreground hover:bg-amber-500">
                    <Link href="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Plan your solar journey</p>
                    <p>Handle your solar energy planning with confidence</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-4xl font-black text-foreground">99.2%</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Prediction accuracy</p>
                  </div>
                  <div>
                    <p className="text-4xl font-black text-foreground">1.4B+</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Data points processed</p>
                  </div>
                  <div>
                    <p className="text-4xl font-black text-foreground">84</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Scientific parameters</p>
                  </div>
                </div>
              </div>

              <Card className="overflow-hidden rounded-2xl border-white/40 bg-white/75 shadow-lg backdrop-blur-md">
                <CardHeader className="border-b border-border/50 bg-muted/30 py-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Target Location</CardTitle>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-2xl font-bold">Almeria, Spain</p>
                    <Badge variant="secondary">Summer Solstice</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Card className="rounded-xl border-border/50 p-3">
                      <p className="text-xs text-muted-foreground">Irradiance</p>
                      <p className="text-2xl font-bold">1,042</p>
                      <p className="text-xs text-muted-foreground">W/m²</p>
                    </Card>
                    <Card className="rounded-xl border-border/50 p-3">
                      <p className="text-xs text-muted-foreground">Panel Efficiency</p>
                      <p className="text-2xl font-bold">22.8</p>
                      <p className="text-xs text-muted-foreground">%</p>
                    </Card>
                    <Card className="rounded-xl border-border/50 p-3">
                      <p className="text-xs text-muted-foreground">Atmospheric Clarity</p>
                      <p className="text-2xl font-bold">0.94</p>
                      <p className="text-xs text-muted-foreground">index</p>
                    </Card>
                    <Card className="rounded-xl border-border/50 p-3">
                      <p className="text-xs text-muted-foreground">Thermal Gain</p>
                      <p className="text-2xl font-bold">+4.2</p>
                      <p className="text-xs text-muted-foreground">°C</p>
                    </Card>
                  </div>

                  <div className="relative rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex h-24 items-end gap-2">
                      {[30, 48, 38, 56, 44, 72, 60, 41, 33].map((height, idx) => (
                        <div key={`bar-${idx}`} className="flex-1 rounded-md bg-amber-100" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">Efficiency Yield Curve</p>
                    <div className="absolute -bottom-3 right-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-semibold text-foreground shadow-md">
                      Analysis result: +24.8%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          { /* Methodology, Data Sources, API Access, and Documentation are off-ramp for current MVP; adding these in final lifecycle as stub references. */}
          {/*
          <section className="bg-[#ecebdf]" id="methodology">
            <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10">
              <Badge variant="secondary" className="mb-4">Scientific Parameters</Badge>
              <h2 className="text-4xl font-black text-foreground">Beyond Simple Sun Tracking</h2>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                This model includes localized environmental physics often missed by traditional
                calculators to support professional-grade solar decisions.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {SCIENCE_CARDS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.title} className="rounded-2xl border-white/40 bg-white/80 p-4 shadow-sm">
                      <CardHeader className="p-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-xl">{item.title}</CardTitle>
                        </div>
                        <CardDescription className="pt-3">{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 pt-6">
                        <p className="text-4xl font-black text-foreground">{item.value}</p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.sub}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
          */}

          <section className="bg-[#f3f3f3]" id="archive">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 md:grid-cols-[290px_minmax(0,1fr)] md:px-10">
              <div className="space-y-4">
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Scientific Pulse</Badge>
                <h2 className="text-4xl font-black text-foreground">The Solar Archive</h2>
                <p className="text-muted-foreground">
                  Stay informed with the latest solar research, market trends, and technological breakthroughs.
                </p>
              </div>

              <SolarArchiveFeed />
            </div>
          </section>

          <footer className="space-y-8 border-t border-border/50 bg-white" id="footer">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 md:grid-cols-4 md:px-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold text-amber-500">
                  <Sun className="h-5 w-5" /> HELIOS
                </div>
                <p className="text-sm text-muted-foreground">
                  Scientific dashboard for solar precision. Built for analysis-first planning.
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="hover:text-foreground">LinkedIn</a>
                  <Dot className="h-3 w-3" />
                  <a href="https://www.researchgate.net" target="_blank" rel="noreferrer" className="hover:text-foreground">ResearchGate</a>
                  <Dot className="h-3 w-3" />
                  <a href="https://github.com/HGK7/solar-output-prediction" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platform</p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li><Link href="/dashboard" className="flex items-center gap-2 hover:text-amber-600"><ChartColumn className="h-4 w-4 text-muted-foreground" />Data Models</Link></li>
                  <li><Link href="/dashboard" className="flex items-center gap-2 hover:text-amber-600"><Sparkles className="h-4 w-4 text-muted-foreground" />API Reference</Link></li>
                  <li><Link href="/analytics" className="hover:text-amber-600">Integration</Link></li>
                </ul>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li><a href="#top" className="hover:text-amber-600">About Science</a></li>
                  <li><a href="mailto:contact@helios.example" className="hover:text-amber-600">Contact Labs</a></li>
                  <li><a href="#archive" className="hover:text-amber-600">Press Kit</a></li>
                </ul>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliance</p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li><Link href="/profile" className="hover:text-amber-600">Privacy Policy</Link></li>
                  <li><Link href="/profile" className="hover:text-amber-600">Terms of Data</Link></li>
                  <li><a href="https://github.com/HGK7/solar-output-prediction" target="_blank" rel="noreferrer" className="hover:text-amber-600">Open Source</a></li>
                </ul>
              </div>
            </div>

            <Separator className="mx-auto w-full max-w-7xl" />
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 pb-10 text-xs text-muted-foreground md:px-10">
              <p>© 2026 HELIOS Scientific Systems. Informational purposes only.</p>
              <p>Scientific mode: active</p>
            </div>
          </footer>
        </main>
      </ScrollArea>
    </div>
  );
}
