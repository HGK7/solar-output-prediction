import type { SavedAnalysisRun, SavedRunSummary } from "@/types";

export type RunSummaryDelta = {
  annualOutputKwh: number;
  annualSavingsUsd: number;
  paybackYears: number;
};

export function computeRunSummaryDelta(
  previous: SavedRunSummary,
  next: SavedRunSummary,
): RunSummaryDelta {
  return {
    annualOutputKwh: Number((next.annualOutputKwh - previous.annualOutputKwh).toFixed(2)),
    annualSavingsUsd: Number((next.annualSavingsUsd - previous.annualSavingsUsd).toFixed(2)),
    paybackYears: Number((next.paybackYears - previous.paybackYears).toFixed(2)),
  };
}

export function formatDelta(value: number, unit = ""): string {
  const prefix = value > 0 ? "+" : "";
  const formatted = `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

export interface MetricDiff {
  baseVal: number;
  compareVal: number;
  delta: number;
  pct: number | null;
  unit: string;
  invertTone?: boolean;
  formatAsCurrency?: boolean;
  decimals?: number;
}

export interface StringConfigDiff {
  baseVal: string;
  compareVal: string;
  changed: boolean;
}

export interface FullRunDiff {
  baseRunId: string;
  compareRunId: string;
  irradiance: MetricDiff;
  annualEnergyKwh: MetricDiff | null;
  capacityFactorPct: MetricDiff | null;
  annualOutputKwh: MetricDiff;
  annualSavingsUsd: MetricDiff;
  monthlySavingsUsd: MetricDiff;
  grossCostUsd: MetricDiff;
  netCostUsd: MetricDiff;
  incentiveUsd: MetricDiff;
  paybackYears: MetricDiff;
  lifetimeSavingsUsd: MetricDiff;
  lifetimeRoiPct: MetricDiff;
  lcoeUsdPerKwh: MetricDiff;
  systemCapacityKw: MetricDiff;
  electricityTariffUsd: MetricDiff;
  performanceRatio: MetricDiff;
  numPanels: MetricDiff | null;
  totalAreaM2: MetricDiff | null;
  panelTechnology: StringConfigDiff;
  installationType: StringConfigDiff;
  gridConnection: StringConfigDiff;
  region: StringConfigDiff;
  modelUsed: StringConfigDiff;
}

function createMetricDiff(
  baseVal: number,
  compareVal: number,
  unit: string,
  options?: {
    invertTone?: boolean;
    formatAsCurrency?: boolean;
    decimals?: number;
  },
): MetricDiff {
  const rawDelta = compareVal - baseVal;
  const decimals = options?.decimals ?? 2;
  const factor = Math.pow(10, decimals);
  const delta = Math.round(rawDelta * factor) / factor;
  const pct =
    baseVal !== 0
      ? Number((((compareVal - baseVal) / Math.abs(baseVal)) * 100).toFixed(1))
      : null;

  return {
    baseVal,
    compareVal,
    delta,
    pct,
    unit,
    invertTone: options?.invertTone,
    formatAsCurrency: options?.formatAsCurrency,
    decimals,
  };
}

function createNullableMetricDiff(
  baseVal: number | null | undefined,
  compareVal: number | null | undefined,
  unit: string,
  options?: {
    invertTone?: boolean;
    formatAsCurrency?: boolean;
    decimals?: number;
  },
): MetricDiff | null {
  if (typeof baseVal !== "number" || typeof compareVal !== "number") {
    return null;
  }
  return createMetricDiff(baseVal, compareVal, unit, options);
}

function createStringDiff(baseVal: string, compareVal: string): StringConfigDiff {
  return {
    baseVal,
    compareVal,
    changed: baseVal !== compareVal,
  };
}

export function computeFullRunDiff(
  baseRun: SavedAnalysisRun,
  compareRun: SavedAnalysisRun,
): FullRunDiff {
  const basePred = baseRun.result.prediction;
  const compPred = compareRun.result.prediction;
  const baseFin = baseRun.result.financial;
  const compFin = compareRun.result.financial;
  const basePhys = baseRun.result.physics_simulation;
  const compPhys = compareRun.result.physics_simulation;
  const baseGeom = baseRun.result.geometry;
  const compGeom = compareRun.result.geometry;
  const baseCfg = baseRun.systemConfig;
  const compCfg = compareRun.systemConfig;

  const baseMonthlySavings =
    baseFin.monthly_savings_usd ?? Number((baseFin.annual_savings_usd / 12).toFixed(2));
  const compMonthlySavings =
    compFin.monthly_savings_usd ?? Number((compFin.annual_savings_usd / 12).toFixed(2));

  const baseGrossCost = baseFin.total_system_cost_usd;
  const compGrossCost = compFin.total_system_cost_usd;

  const baseNetCost = baseFin.net_system_cost_usd ?? baseFin.total_system_cost_usd;
  const compNetCost = compFin.net_system_cost_usd ?? compFin.total_system_cost_usd;

  const baseIncentive = baseFin.incentive_amount_usd ?? 0;
  const compIncentive = compFin.incentive_amount_usd ?? 0;

  return {
    baseRunId: baseRun.id,
    compareRunId: compareRun.id,
    irradiance: createMetricDiff(
      basePred.prediction,
      compPred.prediction,
      basePred.unit || "kWh/m²/day",
      { decimals: 2 },
    ),
    annualEnergyKwh: createNullableMetricDiff(
      basePhys?.annual_energy_kwh,
      compPhys?.annual_energy_kwh,
      "kWh",
      { decimals: 0 },
    ),
    capacityFactorPct: createNullableMetricDiff(
      basePhys?.capacity_factor_pct,
      compPhys?.capacity_factor_pct,
      "%",
      { decimals: 1 },
    ),
    annualOutputKwh: createMetricDiff(
      baseFin.annual_output_kwh,
      compFin.annual_output_kwh,
      "kWh",
      { decimals: 0 },
    ),
    annualSavingsUsd: createMetricDiff(
      baseFin.annual_savings_usd,
      compFin.annual_savings_usd,
      "",
      { formatAsCurrency: true, decimals: 0 },
    ),
    monthlySavingsUsd: createMetricDiff(
      baseMonthlySavings,
      compMonthlySavings,
      "/mo",
      { formatAsCurrency: true, decimals: 0 },
    ),
    grossCostUsd: createMetricDiff(
      baseGrossCost,
      compGrossCost,
      "",
      { invertTone: true, formatAsCurrency: true, decimals: 0 },
    ),
    netCostUsd: createMetricDiff(
      baseNetCost,
      compNetCost,
      "",
      { invertTone: true, formatAsCurrency: true, decimals: 0 },
    ),
    incentiveUsd: createMetricDiff(
      baseIncentive,
      compIncentive,
      "",
      { formatAsCurrency: true, decimals: 0 },
    ),
    paybackYears: createMetricDiff(
      baseFin.simple_payback_years,
      compFin.simple_payback_years,
      "yr",
      { invertTone: true, decimals: 1 },
    ),
    lifetimeSavingsUsd: createMetricDiff(
      baseFin.lifetime_savings_usd,
      compFin.lifetime_savings_usd,
      "",
      { formatAsCurrency: true, decimals: 0 },
    ),
    lifetimeRoiPct: createMetricDiff(
      baseFin.lifetime_roi_pct,
      compFin.lifetime_roi_pct,
      "%",
      { decimals: 1 },
    ),
    lcoeUsdPerKwh: createMetricDiff(
      baseFin.lcoe_usd_per_kwh,
      compFin.lcoe_usd_per_kwh,
      "/kWh",
      { invertTone: true, formatAsCurrency: true, decimals: 3 },
    ),
    systemCapacityKw: createMetricDiff(
      baseCfg?.systemCapacityKw ?? baseFin.system_parameters.capacity_kw,
      compCfg?.systemCapacityKw ?? compFin.system_parameters.capacity_kw,
      "kW",
      { decimals: 1 },
    ),
    electricityTariffUsd: createMetricDiff(
      baseCfg?.electricityTariffUsd ?? baseFin.system_parameters.electricity_tariff_usd_kwh,
      compCfg?.electricityTariffUsd ?? compFin.system_parameters.electricity_tariff_usd_kwh,
      "/kWh",
      { invertTone: true, formatAsCurrency: true, decimals: 3 },
    ),
    performanceRatio: createMetricDiff(
      baseCfg?.performanceRatio ?? baseFin.system_parameters.performance_ratio,
      compCfg?.performanceRatio ?? compFin.system_parameters.performance_ratio,
      "",
      { decimals: 2 },
    ),
    numPanels: createNullableMetricDiff(
      baseGeom?.system_layout?.num_panels ?? baseFin.sizing_guidance?.estimated_panels,
      compGeom?.system_layout?.num_panels ?? compFin.sizing_guidance?.estimated_panels,
      "panels",
      { decimals: 0 },
    ),
    totalAreaM2: createNullableMetricDiff(
      baseGeom?.system_layout?.total_panel_area_m2 ?? baseFin.sizing_guidance?.required_roof_area_m2,
      compGeom?.system_layout?.total_panel_area_m2 ?? compFin.sizing_guidance?.required_roof_area_m2,
      "m²",
      { decimals: 1 },
    ),
    panelTechnology: createStringDiff(
      baseCfg?.panelTechnology ?? "monocrystalline",
      compCfg?.panelTechnology ?? "monocrystalline",
    ),
    installationType: createStringDiff(
      baseCfg?.installationType ?? "rooftop",
      compCfg?.installationType ?? "rooftop",
    ),
    gridConnection: createStringDiff(
      baseCfg?.gridConnection ?? "grid-tied",
      compCfg?.gridConnection ?? "grid-tied",
    ),
    region: createStringDiff(
      baseCfg?.region ?? baseFin.system_parameters.region,
      compCfg?.region ?? compFin.system_parameters.region,
    ),
    modelUsed: createStringDiff(
      basePred.model_used,
      compPred.model_used,
    ),
  };
}
