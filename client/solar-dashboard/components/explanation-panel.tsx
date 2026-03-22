"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BrainCircuit,
  ShieldAlert,
  Lightbulb,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Zap,
  Wind,
  Sun,
  Thermometer,
  Droplets,
  CloudSun,
  type LucideIcon,
} from "lucide-react";
import type { ExplanationResponse, KeyDriver } from "@/types";

/* ─── Value Highlighting ────────────────────────────────── */

const VALUE_RE =
  /(\$[\d,]+\.?\d*|\d[\d,]*\.?\d*\s*(?:kWh\/m²\/day|kWh\/m²|kWh|kWp|kW|Wp|W\/m²|°C|%|years?|months?|hours?|hrs?))/g;

function highlightValues(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  const re = new RegExp(VALUE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span
        key={`v${m.index}`}
        className="font-semibold text-amber-700 bg-amber-100/60 px-1 rounded-sm"
      >
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}

/* ─── Driver Icon Mapping ───────────────────────────────── */

const DRIVER_ICONS: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  "clear sky": { Icon: Sun, color: "text-amber-500", bg: "bg-amber-100/60" },
  irradiance: { Icon: Sun, color: "text-amber-500", bg: "bg-amber-100/60" },
  solar: { Icon: Sun, color: "text-amber-500", bg: "bg-amber-100/60" },
  temperature: { Icon: Thermometer, color: "text-red-500", bg: "bg-red-100/60" },
  wind: { Icon: Wind, color: "text-sky-500", bg: "bg-sky-100/60" },
  humidity: { Icon: Droplets, color: "text-blue-500", bg: "bg-blue-100/60" },
  cloud: { Icon: CloudSun, color: "text-slate-500", bg: "bg-slate-100/60" },
  weather: { Icon: CloudSun, color: "text-slate-500", bg: "bg-slate-100/60" },
};

function getDriverIcon(feature: string): { Icon: LucideIcon; color: string; bg: string } {
  const lower = feature.toLowerCase();
  for (const [key, val] of Object.entries(DRIVER_ICONS)) {
    if (lower.includes(key)) return val;
  }
  return { Icon: Zap, color: "text-violet-500", bg: "bg-violet-100/60" };
}

/* ─── Mini Card Components ──────────────────────────────── */

function DriverCard({ driver, index }: { driver: KeyDriver; index: number }) {
  const { Icon, color, bg } = getDriverIcon(driver.feature);

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-xl bg-linear-to-br from-violet-50/60 via-white/40 to-purple-50/40 backdrop-blur-sm border border-white/40 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 h-full flex flex-col"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bg} shadow-sm shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-sm font-semibold text-foreground mb-1">{driver.feature}</h5>
          <p className="text-xs text-muted-foreground mb-1">
            {driver.value} {driver.unit}
          </p>
          <p className="text-sm text-foreground/70 leading-relaxed">
            {highlightValues(driver.impact)}
          </p>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ text, index }: { text: string; index: number }) {
  // Extract bold term if present, otherwise use first phrase
  const boldMatch = text.match(/\*\*([^*]+)\*\*/);
  const title = boldMatch ? boldMatch[1] : text.split(/[:.]/)[0].slice(0, 30);
  const description = text.replace(/\*\*[^*]+\*\*:?\s*/, "").trim();

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-xl bg-linear-to-br from-red-50/50 via-white/40 to-rose-50/40 backdrop-blur-sm border border-white/40 border-l-4 border-l-red-300 p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-100/60 shadow-sm shrink-0 mt-0.5">
          <ShieldAlert className="h-4 w-4 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-sm font-semibold text-foreground mb-1">{title}</h5>
          <p className="text-sm text-foreground/70 leading-relaxed">
            {highlightValues(description)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ContentCard({
  title,
  content,
  Icon,
  iconColor,
  iconBg,
  gradient,
  borderColor,
}: {
  title: string;
  content: string;
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  gradient: string;
  borderColor: string;
}) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-3 duration-500 rounded-xl bg-linear-to-br ${gradient} backdrop-blur-sm border border-white/40 border-l-4 ${borderColor} p-5 h-full`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg} shadow-sm`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-[15px] text-foreground/80 leading-relaxed">
        {highlightValues(content)}
      </p>
    </div>
  );
}

/* ─── Tabbed Content Layout ─────────────────────────────── */

function TabbedExplanation({ explanation }: { explanation: ExplanationResponse }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-1">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-amber-100/80 data-[state=active]:text-amber-700 rounded-lg text-sm font-medium transition-all"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="analysis"
          className="data-[state=active]:bg-sky-100/80 data-[state=active]:text-sky-700 rounded-lg text-sm font-medium transition-all"
        >
          <Zap className="h-4 w-4 mr-2" />
          Analysis
        </TabsTrigger>
        <TabsTrigger
          value="risks"
          className="data-[state=active]:bg-red-100/80 data-[state=active]:text-red-700 rounded-lg text-sm font-medium transition-all"
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          Risks
        </TabsTrigger>
      </TabsList>

      {/* ─── Overview Tab ─── */}
      <TabsContent value="overview" className="mt-0 space-y-6">
        {/* Summary Card */}
        {explanation.explanation_summary && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-xl bg-linear-to-br from-amber-50/60 via-white/40 to-yellow-50/40 backdrop-blur-sm border border-white/40 border-l-4 border-l-amber-400 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-100/60 shadow-sm">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <h4 className="text-base font-semibold text-foreground">Summary</h4>
            </div>
            <p className="text-[15px] text-foreground/80 leading-relaxed">
              {highlightValues(explanation.explanation_summary)}
            </p>
          </div>
        )}

        {/* Key Drivers Grid */}
        {explanation.key_drivers && explanation.key_drivers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-violet-500" />
              <h4 className="text-base font-semibold text-foreground">Key Drivers</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {explanation.key_drivers.slice(0, 4).map((driver, i) => (
                <DriverCard key={i} driver={driver} index={i} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ─── Analysis Tab ─── */}
      <TabsContent value="analysis" className="mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {explanation.physical_interpretation && (
            <ContentCard
              title="Physical Interpretation"
              content={explanation.physical_interpretation}
              Icon={Zap}
              iconColor="text-sky-500"
              iconBg="bg-sky-100/60"
              gradient="from-sky-50/60 via-white/40 to-blue-50/40"
              borderColor="border-l-sky-400"
            />
          )}
          {explanation.financial_insight && (
            <ContentCard
              title="Financial Outlook"
              content={explanation.financial_insight}
              Icon={TrendingUp}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-100/60"
              gradient="from-emerald-50/60 via-white/40 to-green-50/40"
              borderColor="border-l-emerald-400"
            />
          )}
        </div>
        {!explanation.physical_interpretation && !explanation.financial_insight && (
          <div className="text-center text-muted-foreground py-8">
            Analysis data will appear here once available.
          </div>
        )}
      </TabsContent>

      {/* ─── Risks Tab ─── */}
      <TabsContent value="risks" className="mt-0 space-y-6">
        {/* Uncertainty Card */}
        {explanation.uncertainty_notes && (
          <ContentCard
            title="Uncertainty & Caveats"
            content={explanation.uncertainty_notes}
            Icon={AlertTriangle}
            iconColor="text-orange-500"
            iconBg="bg-orange-100/60"
            gradient="from-orange-50/50 via-white/40 to-amber-50/40"
            borderColor="border-l-orange-400"
          />
        )}

        {/* Risk Factors Grid */}
        {explanation.risk_factors && explanation.risk_factors.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              <h4 className="text-base font-semibold text-foreground">Risk Factors</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {explanation.risk_factors.slice(0, 4).map((risk, i) => (
                <RiskCard key={i} text={risk} index={i} />
              ))}
            </div>
          </div>
        )}

        {!explanation.uncertainty_notes && (!explanation.risk_factors || explanation.risk_factors.length === 0) && (
          <div className="text-center text-muted-foreground py-8">
            Risk information will appear here once available.
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

/* ─── Main Export ────────────────────────────────────────── */

interface ExplanationPanelProps {
  explanation: ExplanationResponse | null;
  isLoading: boolean;
}

export function ExplanationPanel({
  explanation,
  isLoading,
}: ExplanationPanelProps) {
  /* Loading skeleton */
  if (isLoading) {
    return (
      <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  /* No explanation or error */
  if (!explanation || explanation.error) return null;

  const badgeClass = {
    low: "bg-red-50 text-red-600 border-red-200",
    medium: "bg-amber-50 text-amber-600 border-amber-200",
    high: "bg-green-50 text-green-600 border-green-200",
  };

  return (
    <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-purple-500" />
          AI Explanation
        </CardTitle>
        <Badge
          variant="outline"
          className={`text-sm ${badgeClass[explanation.confidence_assessment] ?? badgeClass.medium}`}
        >
          {explanation.confidence_assessment ?? "medium"} confidence
        </Badge>
      </CardHeader>
      <CardContent>
        <TabbedExplanation explanation={explanation} />
      </CardContent>
    </Card>
  );
}
