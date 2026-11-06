"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CalendarRange } from "lucide-react";
import { EmptyState } from "@/components/bento";
import type { SavedLocationRecord } from "@/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS_IN_MONTH: Record<string, number> = {
  Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
  Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31,
};

const MAX_SERIES = 6;
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-2)",
];

interface PortfolioProductionChartProps {
  locations: SavedLocationRecord[];
}

function seriesKey(name: string, index: number) {
  return `site_${index}_${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

export function PortfolioProductionChart({ locations }: PortfolioProductionChartProps) {
  const { chartData, chartConfig, siteCount } = useMemo(() => {
    // Same deterministic formula the backend financial service uses:
    // monthly kWh = irradiance (PSH) × capacity × performance ratio × days
    const sites = locations
      .filter((location) => location.latestRun?.result.monthly)
      .slice(0, MAX_SERIES)
      .map((location, index) => ({
        key: seriesKey(location.name, index),
        name: location.name,
        color: PALETTE[index % PALETTE.length],
        monthly: location.latestRun!.result.monthly!,
        capacityKw: location.systemConfig.systemCapacityKw,
        performanceRatio: location.systemConfig.performanceRatio,
      }));

    const data = MONTHS.map((month) => {
      const row: Record<string, string | number> = { month };
      for (const site of sites) {
        const irradiance = site.monthly[month]?.["Solar Irradiance"] ?? 0;
        row[site.key] = Number(
          (
            irradiance *
            site.capacityKw *
            site.performanceRatio *
            DAYS_IN_MONTH[month]
          ).toFixed(1),
        );
      }
      return row;
    });

    const config: ChartConfig = {};
    for (const site of sites) {
      config[site.key] = { label: site.name, color: site.color };
    }

    return { chartData: data, chartConfig: config, siteCount: sites.length };
  }, [locations]);

  if (siteCount === 0) {
    return (
      <Card className="bento-tile border-tile-border shadow-xs">
        <CardContent className="p-6">
          <EmptyState
            title="No production chart data."
            description="Saved runs need monthly climate series."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bento-tile border-tile-border shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          Estimated monthly production
        </CardTitle>
        <CardDescription>
          Estimated monthly energy production per site.
          {siteCount === MAX_SERIES ? ` Showing first ${MAX_SERIES} sites.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tickFormatter={(value: number) => `${value.toLocaleString()}`}
              label={{
                value: "kWh",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11 },
              }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.keys(chartConfig).map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="portfolio"
                fill={`var(--color-${key})`}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
