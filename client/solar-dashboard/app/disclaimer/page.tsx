import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, HardHat, Landmark, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";

export default function DisclaimerPage() {
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
            Methodology and Engineering Disclaimer
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            How Zenith estimates solar sunlight, energy output, installation costs, and regional incentives, along with the physical checks required before installing panels.
          </p>
        </header>

        <div className="divide-y divide-tile-border border-y border-tile-border">
          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Compass className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Satellite climate averages vs. local weather
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Zenith pulls 38 years of satellite observations from the NASA POWER project across a 0.5° × 0.5° (~50 km) grid.
            </p>
            <ul className="space-y-2 pt-1 text-sm leading-relaxed text-muted-foreground">
              <li>
                Estimates represent the long-term average daily sunlight (kWh/m²/day) for your climate region. Weather varies from year to year.
              </li>
              <li>
                Satellite grid cells cannot see trees, chimneys, neighbor walls, or local dust and smoke on a specific roof.
              </li>
            </ul>
          </section>

          <section className="py-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                How calculations and explanations stay separate
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every number on the screen comes from fixed math and trained climate models. The language assistant explains those numbers and cites reference guides, and never invents or changes a figure.
            </p>
            <div className="grid gap-6 pt-2 sm:grid-cols-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Sunlight estimate</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Trained statistical models estimate daily solar radiation from NASA temperature, humidity, wind, and clear-sky measurements. The training data covers a limited climate range; sites outside it show a warning.
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">System sizing and payback</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Annual kWh production, panel count, roof area, battery cost, subsidies, and 25-year cashflows use standard engineering equations. Previews before you run an analysis use a latitude estimate.
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Cited explanations</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Written summaries and answers cite Zenith&apos;s reference guides and use the same sizing and savings calculators when you ask what-if questions. If no guide supports an answer, the Solar Guide says so.
                </p>
              </div>
            </div>
          </section>

          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <HardHat className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Structural, electrical, and utility inspections
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Have a qualified installer and engineer inspect your property before buying equipment:
            </p>
            <ul className="space-y-2 pt-1 text-sm leading-relaxed text-muted-foreground">
              <li>
                Solar panels and mounting rails add 15 to 25 kg/m² of dead load (more for ballasted flat-roof racks). A structural engineer should confirm roof truss or slab strength.
              </li>
              <li>
                String voltage, rapid-shutdown switches, grounding, and battery placement must follow local electrical and fire codes.
              </li>
              <li>
                Exporting power to the grid requires approval from your local electric utility and sufficient transformer capacity on your street.
              </li>
            </ul>
          </section>

          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Landmark className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Subsidies, tax credits, and utility tariffs
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Incentive amounts depend on your local utility rules and tax filing status:
            </p>
            <ul className="space-y-2 pt-1 text-sm leading-relaxed text-muted-foreground">
              <li>
                India (PM Surya Ghar): Central subsidies up to ₹78,000 apply to residential grid-tied rooftops using approved domestic modules and registered vendors.
              </li>
              <li>
                United States (30% Federal Credit): Tax credits require sufficient federal tax liability and qualifying solar or battery equipment.
              </li>
              <li>
                Europe (0% Solar VAT and Feed-in Tariffs): VAT exemptions and export rates depend on country, system size (such as 30 kWp in Germany), and commissioning date.
              </li>
            </ul>
          </section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
