"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, CartesianAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SavedLocationRecord } from "@/types";
import { useAnalyticsFilters } from "@/lib/analytics-context";

interface AnalyticsComparisonViewProps {
  locations: SavedLocationRecord[];
}

const chartConfig = {
  output: {
    label: "Annual Output",
    color: "var(--chart-2)",
  },
  savings: {
    label: "Annual Savings",
    color: "var(--chart-5)",
  },
  payback: {
    label: "Payback Years",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function AnalyticsComparisonView({ locations }: AnalyticsComparisonViewProps) {
  const { comparison, toggleComparisonLocation, setComparisonActive, getRegionLabel } =
    useAnalyticsFilters();

  const selectedLocations = useMemo(() => {
    return locations.filter((loc) => comparison.locationIds.includes(loc.id)).map((loc) => ({
      ...loc,
      run: loc.latestRun!,
    }));
  }, [locations, comparison.locationIds]);

  if (!comparison.isActive || selectedLocations.length === 0) {
    return null;
  }

  const comparisonData = selectedLocations.map((location) => ({
    name: location.name.length > 12 ? `${location.name.slice(0, 12)}...` : location.name,
    output: Number(location.run.summary.annualOutputKwh.toFixed(0)),
    savings: Number(location.run.summary.annualSavingsUsd.toFixed(0)),
    payback: Number(location.run.summary.paybackYears.toFixed(1)),
    confidence: location.run.summary.confidence,
  }));

  const comparisonTable = selectedLocations.map((location) => ({
    name: location.name,
    output: location.run.summary.annualOutputKwh.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    }),
    savings: `$${location.run.summary.annualSavingsUsd.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`,
    payback: location.run.summary.paybackYears.toFixed(2),
    capacity: location.systemConfig.systemCapacityKw.toFixed(2),
    region: getRegionLabel(location.systemConfig.region),
    confidence: location.run.summary.confidence,
  }));

  const metrics = {
    avgOutput:
      selectedLocations.reduce((sum, loc) => sum + loc.run.summary.annualOutputKwh, 0) /
      selectedLocations.length,
    avgSavings:
      selectedLocations.reduce((sum, loc) => sum + loc.run.summary.annualSavingsUsd, 0) /
      selectedLocations.length,
    avgPayback:
      selectedLocations.reduce((sum, loc) => sum + loc.run.summary.paybackYears, 0) /
      selectedLocations.length,
    bestOutput: Math.max(
      ...selectedLocations.map((loc) => loc.run.summary.annualOutputKwh),
    ),
    bestSavings: Math.max(
      ...selectedLocations.map((loc) => loc.run.summary.annualSavingsUsd),
    ),
    bestPayback: Math.min(
      ...selectedLocations.map((loc) => loc.run.summary.paybackYears),
    ),
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-amber-200/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Comparison: {selectedLocations.length} Sites</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComparisonActive(false)}
            >
              Close
            </Button>
          </CardTitle>
          <CardDescription>
            Side-by-side analysis of selected locations with key performance indicators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="charts" className="w-full">
            <TabsList>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Annual Output Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                      <BarChart data={comparisonData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="output" fill="var(--color-output)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Annual Savings Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                      <BarChart data={comparisonData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="savings" fill="var(--color-savings)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="table">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Annual Output</TableHead>
                      <TableHead className="text-right">Annual Savings</TableHead>
                      <TableHead className="text-right">Payback</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonTable.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{row.output} kWh</TableCell>
                        <TableCell className="text-right">{row.savings}</TableCell>
                        <TableCell className="text-right">{row.payback} yrs</TableCell>
                        <TableCell>{row.capacity} kW</TableCell>
                        <TableCell>{row.region}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {row.confidence}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="metrics">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Average Annual Output</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {metrics.avgOutput.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Best: {metrics.bestOutput.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Average Annual Savings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      ${metrics.avgSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Best: ${metrics.bestSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardDescription>Average Payback Period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {metrics.avgPayback.toFixed(2)} years
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Best: {metrics.bestPayback.toFixed(2)} years
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
