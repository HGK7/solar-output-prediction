import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertTriangle, BookOpen, Cpu, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 pb-20 md:px-6 lg:px-8">
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
            Terms and Conditions
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Terms governing your use of Zenith for residential, commercial, and industrial solar planning.
          </p>
          <p className="text-xs text-muted-foreground">
            Updated November 2026
          </p>
        </header>

        <div className="divide-y divide-tile-border border-y border-tile-border">
          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Purpose of the tool
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Zenith is a solar planning tool for homeowners, site planners, and facility managers. All sunlight estimates, panel counts, battery sizes, and payback schedules are preliminary planning figures.
            </p>
          </section>

          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Not a substitute for on-site engineering or tax advice
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Zenith does not replace a physical roof inspection, a stamped electrical design, or formal tax advice. Before purchasing hardware or signing an installation contract, confirm:
            </p>
            <ul className="space-y-2 pt-1 text-sm leading-relaxed text-muted-foreground">
              <li>
                Roof structural load capacity and local shading from trees, vents, or neighboring buildings.
              </li>
              <li>
                Compliance with local electrical, fire, and utility interconnection codes.
              </li>
              <li>
                Current eligibility rules for government subsidies, tax credits, and net-metering tariffs with your utility or tax advisor.
              </li>
            </ul>
          </section>

          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Scale className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Fair use and API keys
              </h2>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>
                Requests on Zenith&apos;s shared Gemini key have an hourly limit per IP address and a daily limit set by Google. When a limit is reached, written explanations and Solar Guide answers are unavailable; calculated figures still work.
              </li>
              <li>
                You can add your own Google Gemini API key in Preferences. You are responsible for its use and any charges under Google&apos;s terms.
              </li>
              <li>
                Do not submit personal or confidential information, try to bypass limits, or send automated traffic that degrades the service for others.
              </li>
            </ul>
          </section>

          <section className="py-8 space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Availability
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Zenith is a demonstration hosted on free services. It can pause when idle and take up to a minute to start, may be unavailable at times, and its memory caches reset on restart. Saved sites stay in your browser and are not affected by server restarts.
            </p>
          </section>

          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Data sources and attribution
              </h2>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>
                Climate data: NASA Langley Research Center POWER Project (38-year satellite record).
              </li>
              <li>
                Reference guides: Zenith&apos;s own summaries of public sources such as the International Renewable Energy Agency (IRENA) and the National Renewable Energy Laboratory (NREL).
              </li>
              <li>
                Map imagery: Esri, Maxar, Earthstar Geographics. Place search: OpenStreetMap Nominatim.
              </li>
              <li>
                Written explanations and answers: Google Gemini.
              </li>
            </ul>
          </section>

          <section className="py-8 space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Limitation of liability
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Zenith is provided as-is without warranties of any kind, including accuracy, availability, or fitness for a purpose. It is not financial, tax, legal, or engineering advice. The authors and contributors are not liable for financial losses, equipment costs, or property damage resulting from decisions made using these estimates.
            </p>
          </section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
