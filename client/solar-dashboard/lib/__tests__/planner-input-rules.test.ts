import { describe, expect, it } from "bun:test";
import { plannerInputIssue, type PlannerInputs } from "@/lib/planner-input-rules";

const ok: PlannerInputs = {
  planningScale: "homeowner",
  capacityKw: 12.5,
  gridConnection: "hybrid",
  batteryKwh: 16,
  tariffUsd: 0.08,
  performanceRatio: 0.78,
  monthlyBillUsd: 115,
  availableRoofAreaM2: 52,
};

describe("plannerInputIssue", () => {
  it("accepts a valid homeowner plan", () => {
    expect(plannerInputIssue(ok)).toBeNull();
  });

  it("rejects a size outside the scale tier", () => {
    expect(plannerInputIssue({ ...ok, capacityKw: 60 })).toContain("Homeowner plans cover 1–15 kW");
    expect(plannerInputIssue({ ...ok, planningScale: "industrial", capacityKw: 40 })).toContain(
      "Industrial",
    );
  });

  it("rejects empty or non-numeric fields", () => {
    expect(plannerInputIssue({ ...ok, capacityKw: Number.NaN })).not.toBeNull();
    expect(plannerInputIssue({ ...ok, tariffUsd: 0 })).toContain("tariff");
    expect(plannerInputIssue({ ...ok, performanceRatio: 1.2 })).toContain("Performance ratio");
    expect(plannerInputIssue({ ...ok, monthlyBillUsd: -1 })).toContain("bill");
  });

  it("limits battery size to 10 kWh per kW, ignoring it on grid-tied", () => {
    expect(plannerInputIssue({ ...ok, batteryKwh: 200 })).toContain("Battery");
    expect(plannerInputIssue({ ...ok, gridConnection: "grid-tied", batteryKwh: 200 })).toBeNull();
  });
});
