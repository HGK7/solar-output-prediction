"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Calculator,
  PanelTop,
  Compass,
  Sunrise,
} from "lucide-react";
import type { FinancialSummary, GeometryResult } from "@/types";

interface FinancialCardProps {
  financial: FinancialSummary | null;
  geometry?: GeometryResult | null;
  isLoading: boolean;
}

export function FinancialCard({ financial, geometry, isLoading }: FinancialCardProps) {
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [showOutputCalc, setShowOutputCalc] = useState(false);
  const [showGeometry, setShowGeometry] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
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

  const paybackColor =
    financial.simple_payback_years <= 5
      ? "text-green-600"
      : financial.simple_payback_years <= 10
        ? "text-amber-600"
        : "text-red-500";

  const costBreakdown = financial.cost_breakdown;
  const outputCalc = financial.output_calculation;

  return (
    <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Financial Analysis
        </CardTitle>
        <Badge variant="secondary" className="text-xs capitalize">
          {financial.system_parameters.region}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key metrics grid */}
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
            valueColor={paybackColor}
          />
          <MetricBox
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
            label="25-Year ROI"
            value={`${financial.lifetime_roi_pct}%`}
            valueColor={financial.lifetime_roi_pct > 0 ? "text-green-600" : "text-red-500"}
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <SmallMetric label="Annual Savings" value={`$${financial.net_annual_savings_usd}`} />
          <SmallMetric label="LCOE" value={`$${financial.lcoe_usd_per_kwh}/kWh`} />
          <SmallMetric
            label="Lifetime Savings"
            value={`$${financial.lifetime_savings_usd.toLocaleString()}`}
          />
        </div>

        {/* ── Expandable: Output Calculation ── */}
        {outputCalc && (
          <ExpandableSection
            icon={<Calculator className="h-3.5 w-3.5" />}
            title="How Output Was Calculated"
            isOpen={showOutputCalc}
            onToggle={() => setShowOutputCalc(!showOutputCalc)}
          >
            <div className="space-y-2">
              <p className="text-xs font-mono bg-white/60 rounded px-2.5 py-1.5 border border-white/30">
                {outputCalc.formula}
              </p>
              <div className="space-y-1">
                {outputCalc.steps.map((step, i) => (
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                    {step}
                  </p>
                ))}
              </div>
              <div className="text-xs text-muted-foreground/80 space-y-0.5 pt-1.5 border-t border-white/30">
                <p className="font-medium">Performance Ratio Breakdown:</p>
                <p>Inverter efficiency: {outputCalc.performance_ratio_components.inverter_efficiency}</p>
                <p>Wiring losses: {outputCalc.performance_ratio_components.wiring_losses}</p>
                <p>Soiling losses: {outputCalc.performance_ratio_components.soiling_losses}</p>
                <p>Temperature losses: {outputCalc.performance_ratio_components.temperature_losses}</p>
                <p>Combined PR: {outputCalc.performance_ratio_components.combined_ratio}</p>
                <p className="italic pt-0.5">Source: {outputCalc.performance_ratio_components.source}</p>
              </div>
            </div>
          </ExpandableSection>
        )}

        {/* ── Expandable: Cost Breakdown ── */}
        {costBreakdown && (
          <ExpandableSection
            icon={<DollarSign className="h-3.5 w-3.5" />}
            title="Cost Breakdown"
            isOpen={showCostBreakdown}
            onToggle={() => setShowCostBreakdown(!showCostBreakdown)}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <CostLine label="Solar Modules" amount={costBreakdown.module_cost_usd} />
                <CostLine label="Inverter" amount={costBreakdown.inverter_cost_usd} />
                <CostLine label="Balance of System" amount={costBreakdown.bos_cost_usd} />
                <CostLine label="Soft Costs" amount={costBreakdown.soft_cost_usd} />
              </div>
              <div className="text-xs text-muted-foreground/80 pt-1.5 border-t border-white/30 space-y-0.5">
                <p className="font-medium">Sources:</p>
                {Object.entries(costBreakdown.sources).map(([key, src]) => (
                  <p key={key}>
                    <span className="capitalize">{key.replace(/_/g, " ")}:</span> {src}
                  </p>
                ))}
              </div>
            </div>
          </ExpandableSection>
        )}

        {/* ── Expandable: Panel & Geometry ── */}
        {geometry && (
          <ExpandableSection
            icon={<PanelTop className="h-3.5 w-3.5" />}
            title="Panel Layout & Orientation"
            isOpen={showGeometry}
            onToggle={() => setShowGeometry(!showGeometry)}
          >
            <div className="space-y-3">
              {/* Panel spec */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Panel Specification</p>
                <div className="grid grid-cols-2 gap-2">
                  <SmallMetric label="Panel Size" value={`${geometry.panel_spec.length_m}m × ${geometry.panel_spec.width_m}m`} />
                  <SmallMetric label="Per Panel Area" value={`${geometry.panel_spec.area_per_panel_m2} m²`} />
                  <SmallMetric label="Panel Rating" value={`${geometry.panel_spec.watt_peak} Wp`} />
                  <SmallMetric label="Total Panels" value={`${geometry.system_layout.num_panels}`} />
                </div>
                <p className="text-xs text-muted-foreground/80 mt-1 italic">{geometry.panel_spec.source}</p>
              </div>

              {/* Orientation */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" /> Orientation
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <SmallMetric label="Tilt Angle" value={`${geometry.orientation.optimal_tilt_deg}°`} />
                  <SmallMetric label="Azimuth" value={`${geometry.orientation.optimal_azimuth_deg}° (${geometry.orientation.azimuth_direction})`} />
                </div>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {geometry.orientation.tilt_rationale}
                </p>
              </div>

              {/* System layout */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">System Layout</p>
                <p className="text-xs text-muted-foreground/80">
                  {geometry.system_layout.panel_arrangement} = {geometry.system_layout.total_panel_area_m2} m² total array area
                </p>
              </div>

              {/* Dawn to dusk */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Sunrise className="h-3.5 w-3.5" /> Dawn to Dusk (annual avg)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <SmallMetric label="Daylight Hours" value={`${geometry.dawn_to_dusk.annual_avg_daylight_hours}h`} />
                  <SmallMetric label="Noon Sun Angle" value={`${geometry.dawn_to_dusk.annual_avg_solar_noon_altitude_deg}°`} />
                </div>
                {/* Monthly sunrise/sunset mini-table */}
                <div className="mt-2 max-h-36 overflow-y-auto rounded border border-white/30 bg-white/40">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white/70">
                      <tr className="text-muted-foreground">
                        <th className="px-1.5 py-0.5 text-left font-medium">Month</th>
                        <th className="px-1.5 py-0.5 text-right font-medium">Sunrise</th>
                        <th className="px-1.5 py-0.5 text-right font-medium">Sunset</th>
                        <th className="px-1.5 py-0.5 text-right font-medium">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(geometry.dawn_to_dusk.monthly).map(([month, sp]) => (
                        <tr key={month} className="border-t border-white/10 text-muted-foreground/70">
                          <td className="px-1.5 py-0.5">{month}</td>
                          <td className="px-1.5 py-0.5 text-right">{sp.sunrise}</td>
                          <td className="px-1.5 py-0.5 text-right">{sp.sunset}</td>
                          <td className="px-1.5 py-0.5 text-right">{sp.daylight_hours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Methodology citations */}
              <div className="text-xs text-muted-foreground/80 pt-1.5 border-t border-white/30 space-y-0.5">
                <p className="font-medium">Methodology:</p>
                {geometry.methodology.map((m, i) => (
                  <p key={i}>• {m}</p>
                ))}
              </div>
            </div>
          </ExpandableSection>
        )}

        {/* System parameters summary */}
        <div className="text-xs text-muted-foreground pt-2 space-y-1">
          <p>
            System: {financial.system_parameters.capacity_kw} kW |
            Efficiency: {(financial.system_parameters.performance_ratio * 100).toFixed(0)}% |
            Degradation: {financial.system_parameters.degradation_rate_pct}%/yr
          </p>
          <p>Tariff: ${financial.system_parameters.electricity_tariff_usd_kwh}/kWh</p>
        </div>

        {/* Sources */}
        <div className="pt-2 border-t border-white/30">
          <p className="text-xs text-muted-foreground mb-1">Sources:</p>
          <div className="flex flex-wrap gap-1">
            {financial.sources.map((source) => (
              <Badge key={source} variant="outline" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground/80 italic leading-relaxed">
          {financial.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Reusable sub-components ──

function ExpandableSection({
  icon,
  title,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-2 border-t border-white/30">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {icon}
        <span className="font-medium">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>
      {isOpen && (
        <div className="mt-2 rounded-lg bg-white/60 p-4 border border-white/30">
          {children}
        </div>
      )}
    </div>
  );
}

function CostLine({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-md bg-white/60 px-2.5 py-2 text-center border border-white/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-medium">${amount.toLocaleString()}</p>
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
    <div className="rounded-lg bg-white/50 p-3 border border-white/30">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-lg font-semibold ${valueColor ?? ""}`}>{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/50 px-2.5 py-2 text-center border border-white/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
