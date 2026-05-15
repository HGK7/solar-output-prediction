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
  options?: {
    model?: string;
    region?: string;
    system_capacity_kw?: number;
    panel_efficiency?: number;
    performance_ratio?: number;
    electricity_tariff_usd?: number;
    panel_technology?: string;
    installation_type?: string;
  },
): { cancel: () => void } {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    model: options?.model ?? "linear_regression",
    region: options?.region ?? "global",
  });

  if (options?.system_capacity_kw !== undefined) {
    params.set("system_capacity_kw", String(options.system_capacity_kw));
  }
  if (options?.panel_efficiency !== undefined) {
    params.set("panel_efficiency", String(options.panel_efficiency));
  }
  if (options?.performance_ratio !== undefined) {
    params.set("performance_ratio", String(options.performance_ratio));
  }
  if (options?.electricity_tariff_usd !== undefined) {
    params.set("electricity_tariff_usd", String(options.electricity_tariff_usd));
  }
  if (options?.panel_technology !== undefined) {
    params.set("panel_technology", String(options.panel_technology));
  }
  if (options?.installation_type !== undefined) {
    params.set("installation_type", String(options.installation_type));
  }

  const controller = new AbortController();

  (async () => {
    try {
      // Debug helpers: keep a short in-browser ring buffer of raw SSE lines
      try {
        (window as any).__sseDebugLogs = (window as any).__sseDebugLogs || [];
      } catch { }

      try {
        (window as any).__lastStreamEvent = (window as any).__lastStreamEvent || null;
      } catch { }

      const res = await fetch(`${API_BASE}/stream-plan?${params}`, {
        signal: controller.signal,
      });

      try {
        (window as any).__sseDebugLogs.push({ type: "fetch", url: `${API_BASE}/stream-plan?${params}`, ok: res.ok, status: res.status });
        if ((window as any).__sseDebugLogs.length > 200) (window as any).__sseDebugLogs.shift();
      } catch { }

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
          try {
            // store raw incoming line for debugging
            try {
              (window as any).__sseDebugLogs.push({ ts: Date.now(), line });
              if ((window as any).__sseDebugLogs.length > 500) (window as any).__sseDebugLogs.shift();
            } catch { }
          } catch { }
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "ping") {
                continue;
              }
              try {
                (window as any).__lastStreamEvent = { event: currentEvent, data };
              } catch { }
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
