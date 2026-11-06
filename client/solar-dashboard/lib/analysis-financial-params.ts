import type { SystemConfig } from "@/components/system-config-panel";

const PANEL_EFFICIENCY_MAP = {
  monocrystalline: 0.2,
  polycrystalline: 0.17,
  "thin-film": 0.11,
} as const;

export function buildFinancialOverrides(config: SystemConfig) {
  return {
    region: config.region,
    system_capacity_kw: config.systemCapacityKw,
    panel_efficiency: PANEL_EFFICIENCY_MAP[config.panelTechnology],
    performance_ratio: config.performanceRatio,
    electricity_tariff_usd: config.electricityTariffUsd,
    installation_type: config.installationType,
    grid_connection: config.gridConnection,
    panel_technology: config.panelTechnology,
  };
}

export function buildStreamPlanParams(config: SystemConfig) {
  return {
    model: "linear_regression" as const,
    region: config.region,
    system_capacity_kw: config.systemCapacityKw,
    panel_efficiency: PANEL_EFFICIENCY_MAP[config.panelTechnology],
    performance_ratio: config.performanceRatio,
    electricity_tariff_usd: config.electricityTariffUsd,
    panel_technology: config.panelTechnology,
    installation_type: config.installationType,
  };
}
