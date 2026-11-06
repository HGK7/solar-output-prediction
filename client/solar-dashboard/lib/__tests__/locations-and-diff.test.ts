import { describe, expect, it } from "bun:test";
import {
  createSavedRunFromAnalysis,
  normalizeLocationRecord,
  normalizeSavedRun,
  toSafeState,
} from "@/lib/locations-store";
import { computeFullRunDiff } from "@/lib/run-summary-delta";
import type { AnalysisResult, SavedSystemConfig } from "@/types";

function makeSampleResult(overrides?: {
  irradiance?: number;
  capacityKw?: number;
  annualOutputKwh?: number;
  annualSavingsUsd?: number;
  paybackYears?: number;
  grossCostUsd?: number;
  netCostUsd?: number;
  incentiveUsd?: number;
  lcoeUsdPerKwh?: number;
  roiPct?: number;
  lifetimeSavingsUsd?: number;
  tariffUsd?: number;
  pr?: number;
  region?: string;
  modelUsed?: string;
  numPanels?: number;
  areaM2?: number;
}): AnalysisResult {
  const capacityKw = overrides?.capacityKw ?? 5;
  const annualOutputKwh = overrides?.annualOutputKwh ?? 7200;
  const annualSavingsUsd = overrides?.annualSavingsUsd ?? 1080;
  const grossCostUsd = overrides?.grossCostUsd ?? 6500;
  const netCostUsd = overrides?.netCostUsd ?? grossCostUsd;
  const incentiveUsd = overrides?.incentiveUsd ?? grossCostUsd - netCostUsd;

  return {
    prediction: {
      prediction: overrides?.irradiance ?? 5.4,
      unit: "kWh/m²/day",
      model_used: overrides?.modelUsed ?? "random_forest",
      input_features: {},
      error_estimate: 0.12,
      metrics: { rmse: 0.18, r2: 0.91 },
      feature_importance: {},
      ood_warning: false,
    },
    physics_simulation: {
      status: "ok",
      annual_energy_kwh: annualOutputKwh - 120,
      capacity_factor_pct: 16.4,
    },
    financial: {
      annual_output_kwh: annualOutputKwh,
      total_system_cost_usd: grossCostUsd,
      net_system_cost_usd: netCostUsd,
      incentive_amount_usd: incentiveUsd,
      annual_savings_usd: annualSavingsUsd,
      monthly_savings_usd: Number((annualSavingsUsd / 12).toFixed(2)),
      annual_maintenance_usd: 80,
      net_annual_savings_usd: annualSavingsUsd - 80,
      simple_payback_years: overrides?.paybackYears ?? 6.0,
      lifetime_savings_usd: overrides?.lifetimeSavingsUsd ?? 18500,
      lifetime_roi_pct: overrides?.roiPct ?? 284.6,
      lcoe_usd_per_kwh: overrides?.lcoeUsdPerKwh ?? 0.052,
      system_parameters: {
        capacity_kw: capacityKw,
        panel_efficiency: 0.2,
        performance_ratio: overrides?.pr ?? 0.78,
        lifetime_years: 25,
        degradation_rate_pct: 0.5,
        electricity_tariff_usd_kwh: overrides?.tariffUsd ?? 0.15,
        region: overrides?.region ?? "usa",
      },
      yearly_breakdown: Array.from({ length: 25 }, (_, i) => ({
        year: i + 1,
        output_kwh: annualOutputKwh,
        savings_usd: annualSavingsUsd - 80,
        cumulative_savings_usd: (annualSavingsUsd - 80) * (i + 1),
      })),
      sources: [],
      disclaimer: "Illustrative estimate.",
    },
    geometry: {
      panel_spec: {
        length_m: 1.7,
        width_m: 1.1,
        area_per_panel_m2: 1.87,
        watt_peak: 400,
        source: "NREL",
      },
      orientation: {
        optimal_tilt_deg: 28,
        optimal_azimuth_deg: 180,
        azimuth_direction: "South",
        tilt_rationale: "Latitude tilt",
      },
      system_layout: {
        system_capacity_kw: capacityKw,
        num_panels: overrides?.numPanels ?? Math.round((capacityKw * 1000) / 400),
        total_panel_area_m2: overrides?.areaM2 ?? Number((capacityKw * 4.6).toFixed(1)),
        panel_arrangement: "2x7",
      },
      dawn_to_dusk: {
        monthly: {},
        annual_avg_daylight_hours: 12,
        annual_avg_solar_noon_altitude_deg: 62,
      },
      effective_irradiance_factor: 1.04,
      methodology: [],
    },
    explanation: {
      explanation_summary: "Strong solar resource.",
      key_drivers: [],
      physical_interpretation: "Clear sky conditions.",
      uncertainty_notes: "Low variance.",
      risk_factors: [],
      confidence_assessment: "high",
      financial_insight: "Payback within 6 years.",
    },
  };
}

describe("Store v3 migration and normalization", () => {
  it("stamps systemConfig and label in createSavedRunFromAnalysis", () => {
    const result = makeSampleResult({ capacityKw: 8, region: "india", tariffUsd: 0.09 });
    const explicitConfig: SavedSystemConfig = {
      installationType: "carport",
      panelTechnology: "monocrystalline",
      gridConnection: "hybrid",
      region: "india",
      systemCapacityKw: 8,
      electricityTariffUsd: 0.09,
      performanceRatio: 0.8,
      batteryCapacityKwh: 10,
      includeIncentives: true,
    };

    const run = createSavedRunFromAnalysis(result, explicitConfig, "8kW Carport + Battery");
    expect(run.label).toBe("8kW Carport + Battery");
    expect(run.systemConfig.installationType).toBe("carport");
    expect(run.systemConfig.gridConnection).toBe("hybrid");
    expect(run.systemConfig.systemCapacityKw).toBe(8);
    expect(run.systemConfig.batteryCapacityKwh).toBe(10);
  });

  it("backfills legacy v2 runs without systemConfig using result.financial.system_parameters and parent location config", () => {
    const legacyRunResult = makeSampleResult({
      capacityKw: 12.5,
      tariffUsd: 0.22,
      pr: 0.81,
      region: "europe",
    });

    const v2StoreRaw = {
      version: 2,
      locations: [
        {
          id: "loc-1",
          name: "Munich Warehouse",
          coordinates: { lat: 48.1351, lon: 11.582 },
          systemConfig: {
            installationType: "ground-mounted",
            panelTechnology: "polycrystalline",
            gridConnection: "hybrid",
            region: "europe",
            systemCapacityKw: 10,
            electricityTariffUsd: 0.25,
            performanceRatio: 0.78,
          },
          metadata: {
            ownerName: "Hans",
            installationDate: null,
            notes: "",
            tags: ["warehouse"],
          },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          runs: [
            {
              id: "run-legacy-1",
              createdAt: "2026-01-01T10:00:00.000Z",
              // No systemConfig on v2 run!
              summary: {
                annualOutputKwh: 14500,
                annualSavingsUsd: 3190,
                paybackYears: 5.2,
                confidence: "high",
                modelUsed: "random_forest",
              },
              result: legacyRunResult,
            },
          ],
          latestRun: null,
        },
      ],
    };

    const migrated = toSafeState(v2StoreRaw);
    expect(migrated.version).toBe(3);
    expect(migrated.locations).toHaveLength(1);

    const loc = migrated.locations[0];
    expect(loc.runs).toHaveLength(1);
    const backfilledRun = loc.runs[0];

    // Numeric parameters backfilled from run's financial.system_parameters
    expect(backfilledRun.systemConfig.systemCapacityKw).toBe(12.5);
    expect(backfilledRun.systemConfig.electricityTariffUsd).toBe(0.22);
    expect(backfilledRun.systemConfig.performanceRatio).toBe(0.81);
    expect(backfilledRun.systemConfig.region).toBe("europe");
    // Mount & grid inherited from parent location's systemConfig
    expect(backfilledRun.systemConfig.installationType).toBe("ground-mounted");
    expect(backfilledRun.systemConfig.gridConnection).toBe("hybrid");
    expect(loc.latestRun?.id).toBe("run-legacy-1");
  });

  it("normalizeSavedRun works standalone when parentSystemConfig is omitted", () => {
    const result = makeSampleResult({ capacityKw: 6.5, region: "usa", tariffUsd: 0.16 });
    const rawRun = {
      id: "run-standalone",
      createdAt: "2026-02-01T00:00:00.000Z",
      summary: {
        annualOutputKwh: 9000,
        annualSavingsUsd: 1440,
        paybackYears: 5.5,
        confidence: "medium",
        modelUsed: "svm",
      },
      result,
    };

    const normalized = normalizeSavedRun(rawRun);
    expect(normalized).not.toBeNull();
    expect(normalized?.systemConfig.systemCapacityKw).toBe(6.5);
    expect(normalized?.systemConfig.region).toBe("usa");
    expect(normalized?.systemConfig.electricityTariffUsd).toBe(0.16);
  });
});

describe("computeFullRunDiff", () => {
  it("computes accurate deltas, percentages, invertTone flags, and config diffs between base and compare runs", () => {
    const baseResult = makeSampleResult({
      irradiance: 5.0,
      capacityKw: 5.0,
      annualOutputKwh: 7000,
      annualSavingsUsd: 1050,
      paybackYears: 6.5,
      grossCostUsd: 7000,
      netCostUsd: 5500,
      incentiveUsd: 1500,
      lcoeUsdPerKwh: 0.06,
      roiPct: 220,
      lifetimeSavingsUsd: 17500,
      tariffUsd: 0.15,
      pr: 0.78,
      numPanels: 13,
      areaM2: 24.3,
      modelUsed: "linear_regression",
    });

    const compareResult = makeSampleResult({
      irradiance: 5.25,
      capacityKw: 8.0,
      annualOutputKwh: 11200,
      annualSavingsUsd: 1680,
      paybackYears: 5.1,
      grossCostUsd: 10800,
      netCostUsd: 8500,
      incentiveUsd: 2300,
      lcoeUsdPerKwh: 0.048,
      roiPct: 295,
      lifetimeSavingsUsd: 31500,
      tariffUsd: 0.15,
      pr: 0.80,
      numPanels: 20,
      areaM2: 37.4,
      modelUsed: "hist_gradient_boosting",
    });

    const baseRun = createSavedRunFromAnalysis(baseResult, {
      installationType: "rooftop",
      panelTechnology: "monocrystalline",
      gridConnection: "grid-tied",
      region: "usa",
      systemCapacityKw: 5.0,
      electricityTariffUsd: 0.15,
      performanceRatio: 0.78,
    });

    const compareRun = createSavedRunFromAnalysis(compareResult, {
      installationType: "rooftop",
      panelTechnology: "monocrystalline",
      gridConnection: "hybrid",
      region: "usa",
      systemCapacityKw: 8.0,
      electricityTariffUsd: 0.15,
      performanceRatio: 0.80,
    });

    const diff = computeFullRunDiff(baseRun, compareRun);

    // Output diff: 11200 - 7000 = +4200 (+60.0%)
    expect(diff.annualOutputKwh.baseVal).toBe(7000);
    expect(diff.annualOutputKwh.compareVal).toBe(11200);
    expect(diff.annualOutputKwh.delta).toBe(4200);
    expect(diff.annualOutputKwh.pct).toBe(60);

    // Savings diff: 1680 - 1050 = +630 (+60.0%)
    expect(diff.annualSavingsUsd.delta).toBe(630);
    expect(diff.annualSavingsUsd.pct).toBe(60);

    // Payback diff: 5.1 - 6.5 = -1.4 yr (-21.5%), invertTone: true
    expect(diff.paybackYears.delta).toBe(-1.4);
    expect(diff.paybackYears.pct).toBe(-21.5);
    expect(diff.paybackYears.invertTone).toBe(true);

    // LCOE diff: 0.048 - 0.06 = -0.012 (-20.0%), invertTone: true
    expect(diff.lcoeUsdPerKwh.delta).toBe(-0.012);
    expect(diff.lcoeUsdPerKwh.pct).toBe(-20);
    expect(diff.lcoeUsdPerKwh.invertTone).toBe(true);

    // System capacity diff: 8.0 - 5.0 = +3.0 kW (+60.0%)
    expect(diff.systemCapacityKw.delta).toBe(3);
    expect(diff.systemCapacityKw.pct).toBe(60);

    // Hardware & model string diffs
    expect(diff.gridConnection.changed).toBe(true);
    expect(diff.gridConnection.baseVal).toBe("grid-tied");
    expect(diff.gridConnection.compareVal).toBe("hybrid");
    expect(diff.panelTechnology.changed).toBe(false);
    expect(diff.modelUsed.changed).toBe(true);
  });
});
