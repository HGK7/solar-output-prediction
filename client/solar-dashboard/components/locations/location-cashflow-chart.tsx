"use client";

import { BentoTile, EmptyState } from "@/components/bento";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { FinancialSummary } from "@/types";

interface LocationCashflowChartProps {
  financial: FinancialSummary | null;
  compareFinancial?: FinancialSummary | null;
  baseLabel?: string;
  compareLabel?: string;
}

function buildCumulativeNetCashflowSeries(
  financial: FinancialSummary,
  compareFinancial?: FinancialSummary | null,
) {
  const baseCapex =
    financial.net_system_cost_usd ?? financial.total_system_cost_usd;
  const compareCapex = compareFinancial
    ? (compareFinancial.net_system_cost_usd ?? compareFinancial.total_system_cost_usd)
    : 0;

  const baseBreakdown = financial.yearly_breakdown ?? [];
  const compareBreakdown = compareFinancial?.yearly_breakdown ?? [];
  const maxYears = Math.max(baseBreakdown.length, compareBreakdown.length, 25);

  const points: Array<{
    year: string;
    yearNum: number;
    baseNetPosition: number;
    compareNetPosition?: number;
  }> = [
    {
      year: "Yr 0",
      yearNum: 0,
      baseNetPosition: Math.round(-baseCapex),
      ...(compareFinancial ? { compareNetPosition: Math.round(-compareCapex) } : {}),
    },
  ];

  for (let i = 0; i < maxYears; i++) {
    const yr = i + 1;
    const baseRow = baseBreakdown[i];
    const compareRow = compareBreakdown[i];

    const baseCumulativeSavings = baseRow
      ? baseRow.cumulative_savings_usd
      : financial.net_annual_savings_usd * yr;

    const compareCumulativeSavings = compareFinancial
      ? compareRow
        ? compareRow.cumulative_savings_usd
        : compareFinancial.net_annual_savings_usd * yr
      : undefined;

    points.push({
      year: `Yr ${yr}`,
      yearNum: yr,
      baseNetPosition: Math.round(baseCumulativeSavings - baseCapex),
      ...(compareCumulativeSavings !== undefined
        ? { compareNetPosition: Math.round(compareCumulativeSavings - compareCapex) }
        : {}),
    });
  }

  return points;
}

export function LocationCashflowChart({
  financial,
  compareFinancial = null,
  baseLabel = "Base run",
  compareLabel = "Compared run",
}: LocationCashflowChartProps) {
  if (!financial) {
    return (
      <BentoTile title="25-year cumulative cashflow & payback" icon={<TrendingUp className="size-4" />}>
        <EmptyState
          title="No cashflow projection."
          description="Financial breakdown is unavailable for this run."
        />
      </BentoTile>
    );
  }

  const data = buildCumulativeNetCashflowSeries(financial, compareFinancial);

  return (
    <BentoTile
      title="25-year cumulative cashflow & payback"
      icon={<TrendingUp className="size-4" />}
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
            Payback: {financial.simple_payback_years} yr
          </Badge>
          {compareFinancial ? (
            <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
              {compareLabel}: {compareFinancial.simple_payback_years} yr
            </Badge>
          ) : null}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
        >
          <defs>
            <linearGradient id="cashflowPositiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--status-ok)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--status-ok)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            interval={4}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            width={56}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            tickFormatter={(v: number) =>
              v < 0
                ? `-$${Math.abs(Math.round(v / 1000))}k`
                : `$${Math.round(v / 1000)}k`
            }
          />
          <ReferenceLine
            y={0}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: "Break-even ($0)",
              position: "insideTopLeft",
              style: { fontSize: 10, fill: "var(--muted-foreground)" },
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="space-y-1 rounded-lg border border-tile-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                  <p className="font-medium text-foreground">{label}</p>
                  {payload.map((entry) => {
                    const num = Number(entry.value ?? 0);
                    const formatted =
                      num < 0
                        ? `-$${Math.abs(num).toLocaleString()}`
                        : `+$${num.toLocaleString()}`;
                    return (
                      <p key={entry.name} style={{ color: entry.color }} className="tabular-nums">
                        {entry.name}: {formatted}
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="baseNetPosition"
            name={baseLabel}
            stroke="var(--status-ok)"
            strokeWidth={2}
            fill="url(#cashflowPositiveGradient)"
          />
          {compareFinancial ? (
            <Line
              type="monotone"
              dataKey="compareNetPosition"
              name={compareLabel}
              stroke="var(--chart-3)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span
            className="mr-1.5 inline-block h-0.5 w-3 align-middle"
            style={{ backgroundColor: "var(--status-ok)" }}
          />
          {baseLabel} net position
        </span>
        {compareFinancial ? (
          <span>
            <span
              className="mr-1.5 inline-block h-0.5 w-3 border-dashed align-middle"
              style={{ backgroundColor: "var(--chart-3)" }}
            />
            {compareLabel} net position
          </span>
        ) : null}
        <span>Crosses $0 at payback year</span>
      </div>
    </BentoTile>
  );
}
