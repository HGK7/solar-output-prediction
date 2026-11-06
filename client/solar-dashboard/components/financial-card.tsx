"use client";

import { BentoTile, EmptyState } from "@/components/bento";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BatteryCharging, DollarSign, PanelTop } from "lucide-react";
import { InlineDiffBadge } from "@/components/locations/inline-diff-badge";
import type { FullRunDiff, MetricDiff } from "@/lib/run-summary-delta";
import type { FinancialSummary, GeometryResult } from "@/types";
import { cn } from "@/lib/utils";

interface FinancialCardProps {
  financial: FinancialSummary | null;
  geometry?: GeometryResult | null;
  isLoading: boolean;
  /** Slim layout for narrow 1-column tile placements. */
  compact?: boolean;
  /** Results row: 2-col metrics, no disclaimer. */
  dense?: boolean;
  /** Match height of sibling tile in results row 1. */
  fillHeight?: boolean;
  diff?: FullRunDiff | null;
  compareLabel?: string;
}

export function FinancialCard({
  financial,
  geometry,
  isLoading,
  compact = false,
  dense = false,
  fillHeight = false,
  diff = null,
  compareLabel = "Compared run",
}: FinancialCardProps) {
  if (isLoading) {
    return (
      <BentoTile title="Financial" icon={<DollarSign className="size-4" />}>
        <div className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </BentoTile>
    );
  }

  if (!financial) {
    return (
      <BentoTile title="Financial" icon={<DollarSign className="size-4" />}>
        <EmptyState
          title="No financial summary."
          description="Run analysis to generate cost and savings data."
        />
      </BentoTile>
    );
  }

  const paybackTone: "good" | "ok" | "slow" =
    financial.simple_payback_years <= 5
      ? "good"
      : financial.simple_payback_years <= 10
        ? "ok"
        : "slow";

  const monthlySavings =
    financial.monthly_savings_usd ?? Math.round(financial.annual_savings_usd / 12);

  const hasNetCostSubsidy =
    typeof financial.net_system_cost_usd === "number" &&
    financial.net_system_cost_usd < financial.total_system_cost_usd;

  const displaySystemCost =
    typeof financial.net_system_cost_usd === "number"
      ? financial.net_system_cost_usd
      : financial.total_system_cost_usd;

  const batterySummary = financial.battery_summary;

  return (
    <BentoTile
      title="Financial"
      icon={<DollarSign className="size-4" />}
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          {batterySummary?.included ? (
            <Badge
              variant="secondary"
              className="gap-1 text-[10px] font-normal"
              title={`Storage: ${batterySummary.capacity_kwh} kWh ${batterySummary.chemistry} · ${batterySummary.self_consumption_pct}% self-consumption`}
            >
              <BatteryCharging className="size-3 text-primary" aria-hidden />
              {batterySummary.capacity_kwh} kWh {batterySummary.chemistry}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-[10px] capitalize">
            {financial.system_parameters.region}
          </Badge>
        </div>
      }
      className={fillHeight ? "h-full" : undefined}
    >
      <div
        className={cn(
          "flex flex-col",
          fillHeight && "min-h-0 flex-1",
          dense ? "gap-2.5" : "flex-1 gap-4",
        )}
      >
        <div className={dense ? "space-y-0.5" : "metric-hero"}>
          <p className="data-label">Annual savings</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className={dense ? "text-2xl font-semibold tabular-nums tracking-tight" : "metric-hero-value"}>
              ${financial.annual_savings_usd.toLocaleString()}
            </p>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              (~${monthlySavings.toLocaleString()}/mo)
            </span>
            {diff ? (
              <InlineDiffBadge diff={diff.annualSavingsUsd} compareLabel={compareLabel} />
            ) : null}
          </div>
        </div>

        <div className={dense ? "grid grid-cols-2 gap-x-4 gap-y-0" : "space-y-0"}>
          <Row
            label="Annual output"
            value={`${financial.annual_output_kwh.toLocaleString()} kWh`}
            diff={diff?.annualOutputKwh}
            compareLabel={compareLabel}
          />
          <Row
            label="Payback"
            value={`${financial.simple_payback_years} yr`}
            diff={diff?.paybackYears}
            compareLabel={compareLabel}
            valueClass={
              paybackTone === "good"
                ? "text-status-ok"
                : paybackTone === "slow"
                  ? "text-status-error"
                  : undefined
            }
          />
          <Row
            label="25-yr ROI"
            value={`${financial.lifetime_roi_pct}%`}
            diff={diff?.lifetimeRoiPct}
            compareLabel={compareLabel}
            valueClass={
              financial.lifetime_roi_pct > 0 ? "text-status-ok" : "text-status-error"
            }
          />
          <Row
            label={hasNetCostSubsidy ? "Net system cost" : "System cost"}
            value={`$${displaySystemCost.toLocaleString()}`}
            diff={hasNetCostSubsidy ? diff?.netCostUsd : diff?.grossCostUsd}
            compareLabel={compareLabel}
          />
          {hasNetCostSubsidy && !compact ? (
            <Row
              label="Incentive applied"
              value={`-$${(financial.incentive_amount_usd ?? financial.total_system_cost_usd - displaySystemCost).toLocaleString()}`}
              diff={diff?.incentiveUsd}
              compareLabel={compareLabel}
              valueClass="text-status-ok"
            />
          ) : null}
          <Row
            label="LCOE"
            value={`$${financial.lcoe_usd_per_kwh}/kWh`}
            diff={diff?.lcoeUsdPerKwh}
            compareLabel={compareLabel}
          />
          {!compact ? (
            <Row
              label="Lifetime savings"
              value={`$${financial.lifetime_savings_usd.toLocaleString()}`}
              diff={diff?.lifetimeSavingsUsd}
              compareLabel={compareLabel}
            />
          ) : null}
        </div>

        {geometry && !compact ? (
          <div
            className={cn(
              dense ? "border-t border-tile-border pt-2" : "tile-panel space-y-2",
              fillHeight && "mt-auto",
            )}
          >
            <p className="data-label inline-flex items-center gap-1.5">
              <PanelTop className="size-3.5" aria-hidden />
              Layout
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <SmallStat
                label="Panels"
                value={`${geometry.system_layout.num_panels}`}
                diff={diff?.numPanels}
                compareLabel={compareLabel}
              />
              <SmallStat
                label="Tilt"
                value={`${geometry.orientation.optimal_tilt_deg}°`}
              />
              <SmallStat
                label="Azimuth"
                value={geometry.orientation.azimuth_direction}
              />
              <SmallStat
                label="Array area"
                value={`${geometry.system_layout.total_panel_area_m2} m²`}
                diff={diff?.totalAreaM2}
                compareLabel={compareLabel}
              />
            </div>
          </div>
        ) : null}

        {financial.disclaimer && !dense ? (
          <p className="mt-auto text-xs leading-relaxed text-muted-foreground/85">
            {financial.disclaimer}
          </p>
        ) : null}
      </div>
    </BentoTile>
  );
}

function Row({
  label,
  value,
  valueClass,
  diff,
  compareLabel,
}: {
  label: string;
  value: string;
  valueClass?: string;
  diff?: MetricDiff | null;
  compareLabel?: string;
}) {
  return (
    <div className="data-row">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
        <span className={cn("data-value", valueClass)}>{value}</span>
        {diff ? (
          <InlineDiffBadge diff={diff} compact showPct={false} compareLabel={compareLabel} />
        ) : null}
      </span>
    </div>
  );
}

function SmallStat({
  label,
  value,
  diff,
  compareLabel,
}: {
  label: string;
  value: string;
  diff?: MetricDiff | null;
  compareLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground">
        {value}
        {diff ? (
          <InlineDiffBadge diff={diff} compact showPct={false} compareLabel={compareLabel} />
        ) : null}
      </span>
    </div>
  );
}
