"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Construction } from "lucide-react";

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-amber-400 hover:bg-amber-500 text-foreground shadow-lg shadow-amber-200/50 z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-105 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/30">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Solar Knowledge Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Work-in-Progress state */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-100/60 flex items-center justify-center">
            <Construction className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The Solar Knowledge Assistant is currently under development.
              It will answer questions about solar energy, panel efficiency,
              regulations, and installation best practices — all grounded
              in verified sources.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Work in Progress
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
