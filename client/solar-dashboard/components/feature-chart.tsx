"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FeatureChartProps {
  featureImportance: Record<string, number> | null;
  isLoading: boolean;
}

const COLORS = ["#f59e0b", "#38bdf8", "#a78bfa", "#34d399"];

export function FeatureChart({ featureImportance, isLoading }: FeatureChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!featureImportance) return null;

  const data = Object.entries(featureImportance).map(([name, value]) => ({
    name: name.length > 12 ? name.slice(0, 12) + "…" : name,
    fullName: name,
    value: Math.abs(value),
    rawValue: value,
  }));

  return (
    <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-md shadow-yellow-100/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-sky-400" />
          Feature Importance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
              width={110}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg bg-white/90 backdrop-blur-md p-2 shadow-md border border-white/40 text-sm">
                    <p className="font-medium">{d.fullName}</p>
                    <p className="text-muted-foreground">
                      Coefficient: {d.rawValue.toFixed(4)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
