/* CSV export of saved analysis runs — client-side blob download. */

import type { SavedLocationRecord } from "@/types";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const HEADERS = [
  "name",
  "region",
  "lat",
  "lon",
  "installation_type",
  "panel_technology",
  "capacity_kw",
  "electricity_tariff_usd_kwh",
  "performance_ratio",
  "predicted_irradiance_kwh_m2_day",
  "annual_output_kwh",
  "annual_savings_usd",
  "payback_years",
  "lifetime_roi_pct",
  "lcoe_usd_per_kwh",
  "confidence",
  "model_used",
  "run_date",
];

export function buildRunsCsv(locations: SavedLocationRecord[]): string {
  const rows = locations
    .filter((location) => location.latestRun)
    .map((location) => {
      const run = location.latestRun!;
      const financial = run.result.financial;
      const prediction = run.result.prediction;
      return [
        location.name,
        location.systemConfig.region,
        location.coordinates.lat,
        location.coordinates.lon,
        location.systemConfig.installationType,
        location.systemConfig.panelTechnology,
        location.systemConfig.systemCapacityKw,
        location.systemConfig.electricityTariffUsd,
        location.systemConfig.performanceRatio,
        prediction.prediction,
        financial.annual_output_kwh,
        financial.annual_savings_usd,
        run.summary.paybackYears,
        financial.lifetime_roi_pct,
        financial.lcoe_usd_per_kwh,
        run.summary.confidence,
        run.summary.modelUsed,
        run.createdAt,
      ]
        .map(csvEscape)
        .join(",");
    });

  return [HEADERS.join(","), ...rows].join("\n");
}

export function downloadRunsCsv(locations: SavedLocationRecord[]) {
  const csv = buildRunsCsv(locations);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `solar-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
