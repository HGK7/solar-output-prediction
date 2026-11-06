"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Database, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";

const STORAGE_ITEMS = [
  {
    label: "Saved sites and runs",
    purpose: "Stores your pinned locations, system configurations, notes, and run history on this device.",
  },
  {
    label: "Active workspace",
    purpose: "Keeps your current map pin and setup inputs when you refresh the page.",
  },
  {
    label: "Display and planner preferences",
    purpose: "Remembers units, reading depth, and planner defaults.",
  },
  {
    label: "Personal API key (optional)",
    purpose: "Holds your own Gemini API key in this browser if you add one.",
  },
  {
    label: "Notice choices",
    purpose: "Remembers that you dismissed the planner notice or the API key prompt.",
  },
] as const;

const STORAGE_KEYS = [
  "solar-dashboard:saved-locations",
  "solar-dashboard:workspace",
  "solar-dashboard:workspace-inputs",
  "solar-dashboard:guest-preferences",
  "solar-dashboard:ai-key-config",
  "solar-dashboard:reanalysis-intent",
  "solar-dashboard:own-key-prompt-seen",
  "zenith:preferences:v1",
  "zenith:disclaimer-dismissed",
] as const;

export default function PrivacyPage() {
  const [cleared, setCleared] = useState(false);

  function handleClearLocalStorage() {
    if (typeof window === "undefined") return;
    try {
      STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      setCleared(true);
      toast.success("Cleared all saved Zenith data from this browser.");
    } catch {
      toast.error("Unable to clear browser storage. Check your browser site permissions.");
    }
  }

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
            Privacy Policy
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Zenith stores your saved sites, electricity bill assumptions, and preferences in your browser. There are no accounts, no analytics or tracking, and no database of your sites on our server.
          </p>
          <p className="text-xs text-muted-foreground">
            Updated November 2026
          </p>
        </header>

        <div className="divide-y divide-tile-border border-y border-tile-border">
          <section className="py-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                What stays in your browser
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You can use Zenith without creating an account. Your site names, owner notes, coordinates, and saved runs stay in your browser storage on your computer or phone. Solar Guide conversations are not saved and clear when you reload the page.
            </p>
            <div className="divide-y divide-tile-border border-y border-tile-border">
              {STORAGE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="shrink-0 text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground sm:text-right">
                    {item.purpose}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <KeyRound className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Using your own Gemini API key
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If you add your own Google Gemini API key, that key is saved only in your browser:
            </p>
            <ul className="space-y-2 pt-1 text-sm leading-relaxed text-muted-foreground">
              <li>
                When you run an analysis or ask a question, your browser sends the key in a request header over HTTPS so the server can make that call to Google Gemini.
              </li>
              <li>
                The server does not log, save, or share your key, and discards it when the response finishes.
              </li>
              <li>
                Usage and any charges on your key are between you and Google.
              </li>
            </ul>
          </section>

          <section className="py-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Database className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                What the server keeps
              </h2>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>
                Your IP address, held in memory for up to one hour to apply the shared-key limit.
              </li>
              <li>
                Climate data for a coordinate (up to 6 hours) and a written explanation for the same run inputs (up to 1 hour), held in memory so repeat runs are faster. These hold no name or account.
              </li>
              <li>
                Request logs from the server and its hosting provider, which record IP address, time, and request address. The request address can include map coordinates. Question text is not logged.
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Memory caches clear whenever the server restarts. Hosting logs are kept by the hosting provider under its own policy.
            </p>
          </section>

          <section className="py-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                External data providers
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Zenith uses these external services. Each receives only what it needs:
            </p>
            <div className="grid gap-6 pt-1 sm:grid-cols-2">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  NASA POWER Climatology Service
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Receives only the latitude and longitude of your pinned site to return 38-year monthly solar radiation, temperature, humidity, and wind averages. Your site name and notes are never sent to NASA.
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  Google Gemini API
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Receives the technical summary of your run (coordinates, sunlight, system kW, payback) and any question you type into the Solar Guide. With the shared key, Google&apos;s terms for unpaid use apply, which let Google use submitted content to improve its services. Do not enter personal information.
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  OpenStreetMap Nominatim
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Receives the place name you type into map search, directly from your browser.
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  Esri map imagery and unpkg
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your browser loads satellite map tiles for the area you view and map marker images. These requests include your IP address.
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  Hosting providers
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The website and server run on third-party hosting, which processes requests and keeps standard access logs.
                </p>
              </div>
            </div>
          </section>

          <section className="py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Clear your browser data
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Remove all saved sites, run history, workspace settings, and stored API keys from this browser immediately.
                </p>
              </div>
              <div className="shrink-0">
                <Button
                  type="button"
                  variant={cleared ? "outline" : "destructive"}
                  onClick={handleClearLocalStorage}
                >
                  {cleared ? (
                    <>
                      <CheckCircle2 data-icon="inline-start" />
                      Browser data cleared
                    </>
                  ) : (
                    <>
                      <Trash2 data-icon="inline-start" />
                      Clear all saved data
                    </>
                  )}
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
