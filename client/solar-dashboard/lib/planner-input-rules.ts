/** Planner input guardrails. Mirrors backend/utils/validation.py (validate_system_inputs). */

export type PlanningScale = "homeowner" | "small_business" | "industrial";

export const SCALE_CAPACITY_KW: Record<PlanningScale, { min: number; max: number; label: string }> = {
  homeowner: { min: 1, max: 15, label: "Homeowner" },
  small_business: { min: 15, max: 100, label: "Small Business" },
  industrial: { min: 100, max: 5000, label: "Industrial" },
};

export const MAX_BATTERY_KWH_PER_KW = 10;

export interface PlannerInputs {
  planningScale: PlanningScale;
  capacityKw: number;
  gridConnection: "grid-tied" | "hybrid" | "off-grid";
  batteryKwh: number;
  tariffUsd: number;
  performanceRatio: number;
  monthlyBillUsd: number;
  availableRoofAreaM2: number;
}

const inRange = (v: number, min: number, max: number) =>
  Number.isFinite(v) && v >= min && v <= max;

/** First problem with the planner inputs, as a sentence for the user, or null when the run can start. */
export function plannerInputIssue(i: PlannerInputs): string | null {
  if (!inRange(i.capacityKw, 0.5, 5000)) {
    return "Enter a system size between 0.5 kW and 5,000 kW.";
  }
  const tier = SCALE_CAPACITY_KW[i.planningScale];
  if (!inRange(i.capacityKw, tier.min, tier.max)) {
    return `${tier.label} plans cover ${tier.min.toLocaleString()}–${tier.max.toLocaleString()} kW, and this plan is ${i.capacityKw.toLocaleString()} kW. Change the plan scale or the system size.`;
  }
  if (!inRange(i.tariffUsd, 0.01, 5)) {
    return "Enter an electricity tariff between $0.01 and $5.00 per kWh.";
  }
  if (!inRange(i.performanceRatio, 0.4, 0.95)) {
    return "Performance ratio must be between 0.40 and 0.95.";
  }
  if (!inRange(i.monthlyBillUsd, 0, 1_000_000)) {
    return "Enter a monthly bill of $0 or more.";
  }
  if (!inRange(i.availableRoofAreaM2, 0, 1_000_000)) {
    return "Enter a roof area of 0 or more.";
  }
  if (i.gridConnection !== "grid-tied") {
    const maxBattery = i.capacityKw * MAX_BATTERY_KWH_PER_KW;
    if (!inRange(i.batteryKwh, 0, maxBattery)) {
      return `Battery size can be at most ${MAX_BATTERY_KWH_PER_KW} kWh per kW of solar (${maxBattery.toLocaleString()} kWh for ${i.capacityKw.toLocaleString()} kW).`;
    }
  }
  return null;
}
