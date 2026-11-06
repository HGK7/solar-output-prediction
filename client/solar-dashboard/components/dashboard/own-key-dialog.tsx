"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readAiKeyConfig, validateGeminiKey, writeAiKeyConfig } from "@/lib/api";

const OWN_KEY_PROMPT_SEEN = "solar-dashboard:own-key-prompt-seen";

export function shouldPromptForOwnKey(): boolean {
  try {
    return (
      readAiKeyConfig().mode === "system" &&
      !window.localStorage.getItem(OWN_KEY_PROMPT_SEEN)
    );
  } catch {
    return false;
  }
}

interface OwnKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
}

export function OwnKeyDialog({ open, onOpenChange, onProceed }: OwnKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const proceed = () => {
    try {
      window.localStorage.setItem(OWN_KEY_PROMPT_SEEN, "1");
    } catch {
      // storage unavailable: the prompt shows again next time
    }
    onOpenChange(false);
    onProceed();
  };

  const saveKeyAndRun = async () => {
    setChecking(true);
    setMessage("");
    const res = await validateGeminiKey(apiKey);
    setChecking(false);
    if (!res.valid) {
      setMessage(res.message);
      return;
    }
    writeAiKeyConfig({ mode: "byok", apiKey: apiKey.trim() });
    proceed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Use your own Gemini key?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The written explanation and Solar Guide use Google Gemini. The shared
            key has a small daily limit, so notes may be unavailable when it runs
            out. Sunlight, sizing, and savings figures do not depend on it.
          </p>
          <p>
            Your key stays in this browser and is sent only with Zenith requests.
            It is not stored on the server.{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy
            </Link>
          </p>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Gemini API key</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono-tech w-full border border-[#E6E3DC] bg-[#F3F1EC] px-3 py-2 text-sm"
            placeholder="Paste key"
          />
        </label>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline underline-offset-2"
        >
          Get a free key from Google AI Studio
        </a>
        {message ? (
          <p role="alert" className="text-xs text-[#DC2626]">
            {message}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={proceed} disabled={checking}>
            Continue with shared key
          </Button>
          <Button
            onClick={saveKeyAndRun}
            disabled={checking || apiKey.trim().length < 12}
          >
            {checking ? "Checking…" : "Save key and run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
