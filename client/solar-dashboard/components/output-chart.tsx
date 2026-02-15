"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface OutputChartProps {
  monthly: Record<string, MonthlyData> | null;
  isLoading: boolean;
}

const MONTHS_ORDER = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function OutputChart({ monthly, isLoading }: OutputChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!monthly) return null;

  const data = MONTHS_ORDER.map((month) => {
    const solar = monthly[month]?.["Solar Irradiance"] ?? 0;
    const clearSky = monthly[month]?.["Clear Sky Irradiance"] ?? 0;
    const temp = monthly[month]?.Temperature ?? 0;
    return {
      month,
      "Solar Irradiance": Number(solar.toFixed(2)),
      "Clear Sky": Number(clearSky.toFixed(2)),
      "Cloud Loss": Number((clearSky - solar).toFixed(2)),
      "Efficiency": clearSky > 0 ? Number(((solar / clearSky) * 100).toFixed(1)) : 0,
      Temperature: Number(temp.toFixed(1)),
    };
  });

  return (
    <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-400" />
          Monthly Solar Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
              label={{
                value: "kWh/m²/day",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#94a3b8" },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
              label={{
                value: "°C",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 11, fill: "#94a3b8" },
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg bg-white/95 backdrop-blur-md p-3 shadow-md border border-white/40 text-sm space-y-1">
                    <p className="font-medium text-foreground">{label}</p>
                    {payload.map((entry) => {
                      let unit = "kWh/m²/day";
                      if (entry.name === "Temperature") unit = "°C";
                      if (entry.name === "Cloud Loss") unit = "kWh/m²/day";
                      if (entry.name === "Efficiency") unit = "%";
                      return (
                        <p key={entry.name} style={{ color: entry.color }}>
                          {entry.name}: {entry.value} {unit}
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
            {/* Solar irradiance area (actual usable energy) */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="Solar Irradiance"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#solarGradient)"
            />
            {/* Clear sky as a reference ceiling line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Clear Sky"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: "#38bdf8" }}
            />
            {/* Cloud loss as small bars showing the gap */}
            <Bar
              yAxisId="left"
              dataKey="Cloud Loss"
              fill="#cbd5e1"
              fillOpacity={0.5}
              barSize={16}
              radius={[2, 2, 0, 0]}
            />
            {/* Temperature on secondary axis */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Temperature"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ef4444" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground text-center mt-3 justify-center">
          <span><span className="inline-block w-3 h-0.5 bg-amber-400 mr-1 align-middle" /> Solar Irradiance (actual)</span>
          <span><span className="inline-block w-3 h-0.5 bg-sky-400 mr-1 align-middle border-dashed" /> Clear Sky (theoretical max)</span>
          <span><span className="inline-block w-3 h-2 bg-slate-300/50 mr-1 align-middle rounded-sm" /> Cloud/Atmos. Loss</span>
          <span><span className="inline-block w-3 h-0.5 bg-red-500 mr-1 align-middle" /> Temperature</span>
        </div>
      </CardContent>
    </Card>
  );
}
