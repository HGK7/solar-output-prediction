import type { StreamingState } from "@/lib/use-streaming-analysis";
import type { MonthlySeriesPoint } from "@/context/zenith-preferences-context";

const MONTH_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function monthlySeriesFromAnalysis(
  analysis: StreamingState,
): MonthlySeriesPoint[] | null {
  const monthly = analysis.monthly;
  if (!monthly) return null;

  const keys = Object.keys(monthly);
  if (keys.length === 0) return null;

  const ordered =
    MONTH_ORDER.every((m) => m in monthly)
      ? [...MONTH_ORDER]
      : keys;

  return ordered.map((m) => {
    const row = monthly[m];
    const irr = row?.["Solar Irradiance"] ?? 0;
    const clear = row?.["Clear Sky Irradiance"] ?? irr;
    const cloudLoss =
      clear > 0 ? Number((((clear - irr) / clear) * 100).toFixed(1)) : 0;
    return {
      m,
      irr: Number(irr.toFixed(2)),
      clear: Number(clear.toFixed(2)),
      cloudLoss,
      temp: row?.Temperature ?? 0,
    };
  });
}

export function monthlyYieldKwhFromAnalysis(analysis: StreamingState): number[] {
  const physics = analysis.physicsSimulation?.monthly_energy_kwh;
  if (physics?.length) {
    return physics.map((p) => p.energy_kwh);
  }

  const annual = analysis.financial?.annual_output_kwh;
  const series = monthlySeriesFromAnalysis(analysis);
  if (annual && series?.length) {
    const sum = series.reduce((acc, s) => acc + s.irr, 0) || 1;
    return series.map((s) => Math.round((s.irr / sum) * annual));
  }

  if (annual) {
    return Array.from({ length: 12 }, () => Math.round(annual / 12));
  }

  return Array(12).fill(0);
}

export function hasBackendResults(analysis: StreamingState): boolean {
  return !!(analysis.prediction && analysis.financial);
}

export function isAnalysisInFlight(analysis: StreamingState): boolean {
  return (
    analysis.stage !== "idle" &&
    analysis.stage !== "complete" &&
    analysis.stage !== "error"
  );
}
