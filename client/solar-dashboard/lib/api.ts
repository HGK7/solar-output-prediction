/* ──────────────────────────────────────────────────────────────
   Backend API client for the Solar Intelligence API
   ────────────────────────────────────────────────────────────── */

import type { AnalysisResult, RAGResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Health Check ──

export async function healthCheck(
  timeoutMs = 8000,
): Promise<{
  status: string;
  models_loaded: string[];
  rag_chunks: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Backend is not reachable.");
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Full Analysis (non-streaming) ──

export async function analyze(
  params:
    | { lat: number; lon: number; model?: string; financial_overrides?: Record<string, unknown> }
    | { features: Record<string, number>; model?: string; financial_overrides?: Record<string, unknown> },
): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Analysis request failed." }));
    throw new Error(err.error ?? "Analysis request failed.");
  }

  return res.json();
}

// ── Streamed Analysis (SSE) ──

export type StreamPlanCallback = (event: string, data: Record<string, unknown>) => void;

export function streamPlan(
  lat: number,
  lon: number,
  onEvent: StreamPlanCallback,
  options?: { model?: string; region?: string },
): { cancel: () => void } {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    model: options?.model ?? "linear_regression",
    region: options?.region ?? "global",
  });

  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/stream-plan?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        onEvent("error", { error: "Failed to start streaming analysis." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "message";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(currentEvent, data);
            } catch {
              // Skip malformed data lines
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onEvent("error", { error: (err as Error).message });
      }
    }
  })();

  return {
    cancel: () => controller.abort(),
  };
}

// ── RAG Q&A ──

export async function askQuestion(question: string): Promise<RAGResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to get answer." }));
    throw new Error(err.error ?? "Failed to get answer.");
  }

  return res.json();
}
