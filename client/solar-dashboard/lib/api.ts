/* ──────────────────────────────────────────────────────────────
   Backend API client for the Solar Intelligence API
   ────────────────────────────────────────────────────────────── */

import type { AnalysisResult, RAGResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export const AI_KEY_STORAGE_KEY = "solar-dashboard:ai-key-config";
export const AI_KEY_CHANGE_EVENT = "solar-dashboard:ai-key-changed";

export interface AiKeyConfig {
  mode: "system" | "byok";
  apiKey: string;
}

export function readAiKeyConfig(): AiKeyConfig {
  if (typeof window === "undefined") {
    return { mode: "system", apiKey: "" };
  }
  try {
    const raw = window.localStorage.getItem(AI_KEY_STORAGE_KEY);
    if (!raw) return { mode: "system", apiKey: "" };
    const parsed = JSON.parse(raw) as Partial<AiKeyConfig>;
    return {
      mode: parsed.mode === "byok" ? "byok" : "system",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    };
  } catch {
    return { mode: "system", apiKey: "" };
  }
}

export function writeAiKeyConfig(config: AiKeyConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_KEY_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(AI_KEY_CHANGE_EVENT, { detail: config }));
  } catch {
    // ignore storage quota errors
  }
}

export function getByokHeader(): Record<string, string> {
  const { mode, apiKey } = readAiKeyConfig();
  const trimmed = apiKey.trim();
  if (mode === "byok" && trimmed.length >= 12) {
    return { "X-Gemini-Api-Key": trimmed };
  }
  return {};
}

// ── Health Check ──

export interface HealthCheckResponse {
  status: string;
  models_loaded: string[];
  rag_chunks: number | null;
  compute_device?: string;
  compute_capabilities?: {
    active_device?: string;
    cuda_available?: boolean;
    gpu_name?: string | null;
    cpu_Logical_cores?: number;
  };
  system_key_configured?: boolean;
  system_quota?: {
    remaining: number;
    limit: number;
    window_seconds: number;
  };
}

export async function healthCheck(
  timeoutMs = 8000,
): Promise<HealthCheckResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/health", {
      signal: controller.signal,
    });
    if (res.status === 504) {
      throw new DOMException("Backend timed out", "AbortError");
    }
    if (!res.ok) throw new Error("Backend is not reachable.");
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function validateGeminiKey(
  apiKey: string,
): Promise<{ valid: boolean; model: string; message: string }> {
  const trimmed = apiKey.trim();
  if (trimmed.length < 12) {
    return {
      valid: false,
      model: "gemini-2.5-flash",
      message: "Provide a valid Gemini API key (at least 12 characters).",
    };
  }
  try {
    const res = await fetch(`${API_BASE}/validate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gemini-Api-Key": trimmed,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    return {
      valid: Boolean(data.valid && res.ok),
      model: typeof data.model === "string" ? data.model : "gemini-2.5-flash",
      message:
        typeof data.message === "string"
          ? data.message
          : res.ok
            ? "API key verified with Gemini."
            : "Gemini rejected this API key.",
    };
  } catch {
    return {
      valid: false,
      model: "gemini-2.5-flash",
      message: "Could not reach backend to validate API key.",
    };
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
    headers: {
      "Content-Type": "application/json",
      ...getByokHeader(),
    },
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
    grid_connection?: string;
    battery_capacity_kwh?: number;
    include_incentives?: boolean;
    monthly_bill_usd?: number;
    monthly_consumption_kwh?: number;
    available_roof_area_m2?: number;
    planning_scale?: string;
  },
): { cancel: () => void } {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    model: options?.model ?? "hist_gradient_boosting",
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
  if (options?.grid_connection !== undefined) {
    params.set("grid_connection", String(options.grid_connection));
  }
  if (options?.battery_capacity_kwh !== undefined) {
    params.set("battery_capacity_kwh", String(options.battery_capacity_kwh));
  }
  if (options?.include_incentives !== undefined) {
    params.set("include_incentives", String(options.include_incentives));
  }
  if (options?.monthly_bill_usd !== undefined) {
    params.set("monthly_bill_usd", String(options.monthly_bill_usd));
  }
  if (options?.monthly_consumption_kwh !== undefined) {
    params.set("monthly_consumption_kwh", String(options.monthly_consumption_kwh));
  }
  if (options?.available_roof_area_m2 !== undefined) {
    params.set("available_roof_area_m2", String(options.available_roof_area_m2));
  }
  if (options?.planning_scale !== undefined) {
    params.set("planning_scale", String(options.planning_scale));
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
        headers: {
          ...getByokHeader(),
        },
      });

      try {
        (window as any).__sseDebugLogs.push({ type: "fetch", url: `${API_BASE}/stream-plan?${params}`, ok: res.ok, status: res.status });
        if ((window as any).__sseDebugLogs.length > 200) (window as any).__sseDebugLogs.shift();
      } catch { }

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        onEvent("error", {
          error:
            (body && typeof body.error === "string" && body.error) ||
            "The analysis could not start. Please try again.",
        });
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

// ── What-if (deterministic financial re-simulation) ──

export async function whatIf(
  predictedIrradianceKwhM2Day: number,
  financialOverrides: Record<string, unknown>,
): Promise<{ financial: import("@/types").FinancialSummary }> {
  const res = await fetch(`${API_BASE}/what-if`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      predicted_irradiance_kwh_m2_day: predictedIrradianceKwhM2Day,
      financial_overrides: financialOverrides,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "What-if simulation failed." }));
    throw new Error(err.error ?? "What-if simulation failed.");
  }

  return res.json();
}

// ── Recommendations (deterministic) ──

export async function getRecommendations(params: {
  predictedIrradianceKwhM2Day: number;
  financialOverrides?: Record<string, unknown>;
  lat?: number | null;
  lon?: number | null;
}): Promise<{ recommendations: import("@/types").Recommendation[] }> {
  const res = await fetch(`${API_BASE}/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      predicted_irradiance_kwh_m2_day: params.predictedIrradianceKwhM2Day,
      financial_overrides: params.financialOverrides ?? {},
      lat: params.lat ?? undefined,
      lon: params.lon ?? undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Recommendations failed." }));
    throw new Error(err.error ?? "Recommendations failed.");
  }

  return res.json();
}

// ── Portfolio insights (grounded LLM over saved runs) ──

export interface PortfolioSitePayload {
  name: string;
  region: string;
  capacity_kw: number;
  annual_output_kwh: number;
  annual_savings_usd: number;
  payback_years: number;
}

export interface PortfolioInsightsResponse {
  summary: string;
  highlights: string[];
  watchouts: string[];
  stats: Record<string, unknown>;
}

export async function getPortfolioInsights(
  sites: PortfolioSitePayload[],
): Promise<PortfolioInsightsResponse> {
  const res = await fetch(`${API_BASE}/portfolio-insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getByokHeader(),
    },
    body: JSON.stringify({ sites }),
  });

  if (res.status === 503) {
    throw new RAGUnavailableError("Insights service is offline.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Portfolio insights failed." }));
    throw new Error(err.error ?? "Portfolio insights failed.");
  }

  return res.json();
}

// ── RAG Q&A ──

export class RAGUnavailableError extends Error {
  constructor(message = "Knowledge base is offline.") {
    super(message);
    this.name = "RAGUnavailableError";
  }
}

export async function askQuestion(
  question: string,
  context?: string,
): Promise<RAGResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getByokHeader(),
    },
    body: JSON.stringify(context ? { question, context } : { question }),
  });

  if (res.status === 503) {
    throw new RAGUnavailableError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to get answer." }));
    throw new Error(err.error ?? "Failed to get answer.");
  }

  return res.json();
}
