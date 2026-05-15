"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
  PanelTop,
} from "lucide-react";
import type { FinancialSummary, GeometryResult } from "@/types";

interface FinancialCardProps {
  financial: FinancialSummary | null;
  geometry?: GeometryResult | null;
  isLoading: boolean;
}

export function FinancialCard({ financial, geometry, isLoading }: FinancialCardProps) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!financial) return null;

  const paybackTone =
    financial.simple_payback_years <= 5
      ? "good"
      : financial.simple_payback_years <= 10
        ? "ok"
        : "slow";

  const paybackClass =
    paybackTone === "good"
      ? "text-green-700"
      : paybackTone === "ok"
        ? "text-amber-700"
        : "text-red-700";

  return (
    <Card className="glass-card border-emerald-200/50 bg-linear-to-br from-emerald-50/35 via-white/90 to-sky-50/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Financial report
        </CardTitle>
        <Badge variant="secondary" className="text-xs capitalize">
          {financial.system_parameters.region}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricBox
            icon={<Zap className="h-4 w-4 text-amber-400" />}
            label="Annual Output"
            value={`${financial.annual_output_kwh.toLocaleString()} kWh`}
          />
          <MetricBox
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
            label="System Cost"
            value={`$${financial.total_system_cost_usd.toLocaleString()}`}
          />
          <MetricBox
            icon={<Clock className="h-4 w-4 text-sky-400" />}
            label="Payback Period"
            value={`${financial.simple_payback_years} years`}
            valueColor={paybackClass}
          />
          <MetricBox
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
            label="25-Year ROI"
            value={`${financial.lifetime_roi_pct}%`}
            valueColor={financial.lifetime_roi_pct > 0 ? "text-green-600" : "text-red-500"}
          />
        </div>

        <Separator className="bg-emerald-100/80" />

        <div className="grid grid-cols-3 gap-2">
          <SmallMetric label="Net Savings" value={`$${financial.net_annual_savings_usd.toLocaleString()}`} />
          <SmallMetric label="LCOE" value={`$${financial.lcoe_usd_per_kwh}/kWh`} />
          <SmallMetric
            label="Lifetime Savings"
            value={`$${financial.lifetime_savings_usd.toLocaleString()}`}
          />
        </div>

        <Separator className="bg-sky-100/80" />

        <div className="rounded-xl border border-emerald-100/70 bg-white/80 p-3 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Cost snapshot</p>
          <div className="grid grid-cols-2 gap-2">
            <SmallMetric label="Annual Savings" value={`$${financial.annual_savings_usd.toLocaleString()}`} />
            <SmallMetric label="Maintenance" value={`$${financial.annual_maintenance_usd.toLocaleString()}`} />
            <SmallMetric label="Tariff" value={`$${financial.system_parameters.electricity_tariff_usd_kwh}/kWh`} />
            <SmallMetric label="Capacity" value={`${financial.system_parameters.capacity_kw} kW`} />
          </div>
        </div>

        <Separator className="bg-amber-100/80" />

        {geometry && (
          <div className="rounded-xl border border-sky-100/70 bg-white/80 p-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
              <PanelTop className="h-3.5 w-3.5" /> Layout Snapshot
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SmallMetric label="Panels" value={`${geometry.system_layout.num_panels}`} />
              <SmallMetric label="Tilt" value={`${geometry.orientation.optimal_tilt_deg}°`} />
              <SmallMetric label="Azimuth" value={`${geometry.orientation.azimuth_direction}`} />
              <SmallMetric label="Array Area" value={`${geometry.system_layout.total_panel_area_m2} m²`} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {financial.sources.slice(0, 4).map((source) => (
            <Badge key={source} variant="outline" className="text-xs">
              {source}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground/85 leading-relaxed">
          {financial.disclaimer}
        </p>

        {financial.cost_breakdown && (
          <div className="rounded-xl border border-white/50 bg-white/80 p-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Cost breakdown</p>
            <div className="grid grid-cols-2 gap-2">
              <CostLine label="Modules" amount={financial.cost_breakdown.module_cost_usd} />
              <CostLine label="Inverter" amount={financial.cost_breakdown.inverter_cost_usd} />
              <CostLine label="BoS" amount={financial.cost_breakdown.bos_cost_usd} />
              <CostLine label="Soft" amount={financial.cost_breakdown.soft_cost_usd} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CostLine({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-md bg-linear-to-br from-white/85 to-amber-50/35 px-2.5 py-2 text-center border border-white/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">${amount.toLocaleString()}</p>
    </div>
  );
}

function MetricBox({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg bg-linear-to-br from-white/85 to-sky-50/30 p-3 border border-white/40">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-semibold ${valueColor ?? ""}`}>{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-linear-to-br from-white/85 to-slate-50/35 px-2.5 py-2 text-center border border-white/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-medium">{value}</p>
    </div>
  );
}
