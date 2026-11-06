"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { notifyAuthComingSoon } from "@/lib/auth-coming-soon";

export interface LegalFooterProps {
  variant?: "default" | "compact";
  className?: string;
}

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Workspace" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Methodology" },
] as const;

export function LegalFooter({
  variant = "default",
  className,
}: LegalFooterProps) {
  if (variant === "compact") {
    return (
      <footer
        aria-label="Legal and methodology links"
        className={cn(
          "mt-8 border-t border-tile-border pt-4 pb-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-relaxed">
            Estimates use 38-year NASA satellite climate averages and standard IRENA/NREL cost models. Saved sites stay in your browser.
          </p>
          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap items-center gap-x-3.5 gap-y-1 shrink-0"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer
      aria-label="Site footer"
      className={cn(
        "border-t border-tile-border bg-background px-4 py-10 text-sm text-muted-foreground md:px-6 md:py-12 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-foreground">
              <span className="font-semibold">Zenith</span>
              {" · "}
              <span className="text-muted-foreground">Solar Intelligence Dashboard</span>
            </p>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Estimates use 38-year NASA satellite climate averages and standard IRENA/NREL cost models. Saved sites stay in your browser.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              className="transition-colors hover:text-foreground"
              onClick={() => notifyAuthComingSoon()}
            >
              Sign in
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
