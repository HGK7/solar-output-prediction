"use client";

import { BentoTile, EmptyState } from "@/components/bento";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyData } from "@/types";
import { useGuestPreferencesContext } from "@/lib/guest-preferences-context";
import { cn } from "@/lib/utils";

interface OutputChartProps {
  monthly: Record<string, MonthlyData> | null;
  isLoading: boolean;
  /** Full-width strip chart (short height). */
  wide?: boolean;
  compareMonthly?: Record<string, MonthlyData> | null;
  compareLabel?: string;
}

const MONTHS_ORDER = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function OutputChart({
  monthly,
  isLoading,
  wide = false,
  compareMonthly = null,
  compareLabel = "Compared run",
}: OutputChartProps) {
  const { convertTemperature, temperatureUnit } = useGuestPreferencesContext();

  if (isLoading) {
    return (
      <BentoTile>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-52 w-full" />
      </BentoTile>
    );
  }

  if (!monthly) {
    return (
      <BentoTile title="Monthly solar profile" icon={<Calendar className="size-4" />}>
        <EmptyState
          title="No monthly solar profile."
          description="Climate series is unavailable for this run."
        />
      </BentoTile>
    );
  }

  const compareSeriesKey = `${compareLabel} Irradiance`;

  const data = MONTHS_ORDER.map((month) => {
    const solar = monthly[month]?.["Solar Irradiance"] ?? 0;
    const clearSky = monthly[month]?.["Clear Sky Irradiance"] ?? 0;
    const temp = monthly[month]?.Temperature ?? 0;
    const compareSolar = compareMonthly?.[month]?.["Solar Irradiance"];
    return {
      month,
      "Solar Irradiance": Number(solar.toFixed(2)),
      "Clear Sky": Number(clearSky.toFixed(2)),
      "Cloud Loss": Number((clearSky - solar).toFixed(2)),
      "Efficiency": clearSky > 0 ? Number(((solar / clearSky) * 100).toFixed(1)) : 0,
      Temperature: Number(convertTemperature(temp).toFixed(1)),
      ...(typeof compareSolar === "number"
        ? { [compareSeriesKey]: Number(compareSolar.toFixed(2)) }
        : {}),
    };
  });

  return (
    <BentoTile
      title="Monthly solar profile"
      icon={<Calendar className="size-4" />}
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: wide ? 4 : 5 }}
        >
          <defs>
            <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
          <YAxis
            yAxisId="left"
            width={wide ? 40 : 48}
            tick={{ fontSize: wide ? 11 : 12 }}
            stroke="var(--muted-foreground)"
            label={
              wide
                ? undefined
                : {
                    value: "kWh/m²/day",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11, fill: "var(--muted-foreground)" },
                  }
            }
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            width={wide ? 32 : 48}
            tick={{ fontSize: wide ? 11 : 12 }}
            stroke="var(--muted-foreground)"
            label={
              wide
                ? undefined
                : {
                    value: temperatureUnit,
                    angle: 90,
                    position: "insideRight",
                    style: { fontSize: 11, fill: "var(--muted-foreground)" },
                  }
            }
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="space-y-1 rounded-lg border border-tile-border bg-popover p-3 text-sm text-popover-foreground shadow-md">
                  <p className="font-medium text-foreground">{label}</p>
                  {payload.map((entry) => {
                    let unit = "kWh/m²/day";
                    if (entry.name === "Temperature") unit = temperatureUnit;
                    if (entry.name === "Cloud Loss") unit = "kWh/m²/day";
                    if (entry.name === "Efficiency") unit = "%";
                    return (
                      <p key={entry.name} style={{ color: entry.color }} className="tabular-nums">
                        {entry.name}: {entry.value} {unit}
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />
          {!wide ? (
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          ) : null}
          {/* Solar irradiance area (actual usable energy) */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="Solar Irradiance"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#solarGradient)"
          />
          {compareMonthly ? (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={compareSeriesKey}
              stroke="var(--chart-5)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 2.5, fill: "var(--chart-5)" }}
            />
          ) : null}
          {/* Clear sky as a reference ceiling line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Clear Sky"
            stroke="var(--chart-3)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 3, fill: "var(--chart-3)" }}
          />
          {/* Cloud loss as small bars showing the gap */}
          <Bar
            yAxisId="left"
            dataKey="Cloud Loss"
            fill="var(--chart-4)"
            fillOpacity={0.5}
            barSize={16}
            radius={[2, 2, 0, 0]}
          />
          {/* Temperature on secondary axis */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Temperature"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-2)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div
        className={cn(
          "flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground",
          wide ? "mt-2 justify-start" : "mt-3 justify-center text-center",
        )}
      >
        <span><span className="inline-block w-3 h-0.5 mr-1 align-middle" style={{ backgroundColor: "var(--chart-1)" }} /> Solar Irradiance (actual)</span>
        {compareMonthly ? (
          <span><span className="inline-block w-3 h-0.5 mr-1 align-middle border-dashed" style={{ backgroundColor: "var(--chart-5)" }} /> {compareSeriesKey}</span>
        ) : null}
        <span><span className="inline-block w-3 h-0.5 mr-1 align-middle border-dashed" style={{ backgroundColor: "var(--chart-3)" }} /> Clear Sky (theoretical max)</span>
        <span><span className="inline-block w-3 h-2 mr-1 align-middle rounded-sm" style={{ backgroundColor: "var(--chart-4)" }} /> Cloud/Atmos. Loss</span>
        <span><span className="inline-block w-3 h-0.5 mr-1 align-middle" style={{ backgroundColor: "var(--chart-2)" }} /> Temperature</span>
      </div>
    </BentoTile>
  );
}
