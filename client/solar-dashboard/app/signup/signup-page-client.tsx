"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notifyAuthComingSoon } from "@/lib/auth-coming-soon";

export default function SignupPage() {
  useEffect(() => {
    notifyAuthComingSoon();
  }, []);

  return (
    <div className="h-full overflow-hidden bg-background">
      <ScrollArea className="app-shell-scroll h-full">
        <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-12 md:px-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <SunMedium className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">Zenith</p>
                <p className="text-sm text-muted-foreground">Create account</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Continue as a guest. Data is stored in this browser.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/dashboard">Continue as guest</Link>
              </Button>
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
