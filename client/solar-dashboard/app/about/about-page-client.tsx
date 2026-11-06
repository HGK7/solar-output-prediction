"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";

const WORKFLOW = [
  {
    title: "Pin your roof or site",
    body: "Choose a location on the map, enter your monthly electric bill or target kW, and pick your grid or battery setup.",
    icon: MapPin,
  },
  {
    title: "Run the solar and cost check",
    body: "Zenith pulls 38 years of NASA satellite climate data, estimates daily sunlight, and calculates panel count, subsidies, and 25-year payback.",
    icon: BarChart3,
  },
  {
    title: "Compare runs and verify sources",
    body: "Save sites in your browser, stack new runs as you test different options, and read explanations backed by engineering reports.",
    icon: ShieldCheck,
  },
] as const;

const CAPABILITIES = [
  {
    title: "Satellite climate record",
    body: "Uses 38-year monthly solar irradiance, temperature, humidity, and wind data from the NASA POWER satellite archive.",
  },
  {
    title: "Practical bill & roof sizing",
    body: "Converts your monthly electricity bill and available roof area into recommended kW capacity and 400 W panel count.",
  },
  {
    title: "Grid-tied, hybrid, and off-grid economics",
    body: "Models net metering, LFP battery storage with 12-year cell replacement, and regional incentives across India, the US, and Europe.",
  },
  {
    title: "Source-backed explanations",
    body: "Answers questions using indexed NREL, IRENA, and policy guides while running exact sizing calculators for every number.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 pb-20 md:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              Home
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">
              Open workspace
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <header className="mb-12 max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            About Zenith
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Zenith helps homeowners, business owners, and site planners evaluate solar installations with transparent math and cited data sources.
          </p>
        </header>

        <div className="divide-y divide-tile-border border-y border-tile-border">
          <section className="py-10">
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-foreground">
              How it works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {WORKFLOW.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="space-y-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <h3 className="text-base font-medium text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="py-10">
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-foreground">
              What is included
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {CAPABILITIES.map((item) => (
                <div key={item.title} className="space-y-1.5">
                  <h3 className="text-base font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Inspect our methodology and privacy commitments
                </h2>
                <p className="text-sm text-muted-foreground">
                  Read how calculations work, what physical checks your roof needs, and how browser storage protects your privacy.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button asChild variant="outline" size="sm">
                  <Link href="/disclaimer">Methodology</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/privacy">Privacy Policy</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
