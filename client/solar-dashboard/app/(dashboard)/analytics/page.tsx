"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, DollarSign, Gauge, MapPin, SunMedium, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocationsStore } from "@/lib/locations-store";
import { useAnalyticsFilters } from "@/lib/analytics-context";
import { AnalyticsFilterPanel } from "@/components/analytics-filter-panel";
import { AnalyticsComparisonView } from "@/components/analytics-comparison-view";

const chartConfig = {
  output: {
    label: "Annual Output (kWh)",
    color: "var(--chart-2)",
  },
  savings: {
    label: "Annual Savings (USD)",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

function shortName(value: string) {
  return value.length <= 16 ? value : `${value.slice(0, 16)}...`;
}

export default function AnalyticsPage() {
  const { locations, isHydrated } = useLocationsStore();
  const {
    filters,
    comparison,
    toggleComparisonLocation,
    setComparisonActive,
    getRegionLabel,
  } = useAnalyticsFilters();

  const filteredAndAnalyzed = useMemo(() => {
    const withRuns = locations.filter((location) => location.latestRun !== null);

    // Apply filters
    const filtered = withRuns.filter((location) => {
      const run = location.latestRun!;

      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const createdAt = new Date(run.createdAt);
        if (filters.dateRange.from && createdAt < filters.dateRange.from) return false;
        if (filters.dateRange.to && createdAt > filters.dateRange.to) return false;
      }

      // Region filter
      if (!filters.includeAllRegions && filters.regions.length > 0) {
        if (!filters.regions.includes(location.systemConfig.region)) return false;
      }

      // Confidence filter
      const confidenceMap = { low: 1, medium: 2, high: 3 };
      const minValue = confidenceMap[filters.confidenceMin];
      const locValue = confidenceMap[run.summary.confidence];
      if (locValue < minValue) return false;

      return true;
    });

    const runs = filtered.map((location) => ({
      id: location.id,
      name: location.name,
      run: location.latestRun!,
      systemCapacityKw: location.systemConfig.systemCapacityKw,
      region: location.systemConfig.region,
      confidence: location.latestRun!.summary.confidence,
    }));

    const totals = runs.reduce(
      (acc, item) => {
        acc.output += item.run.summary.annualOutputKwh;
        acc.savings += item.run.summary.annualSavingsUsd;
        acc.payback += item.run.summary.paybackYears;
        acc.capacity += item.systemCapacityKw;
        acc.confidence[item.confidence] += 1;
        acc.region[item.region] = (acc.region[item.region] ?? 0) + 1;
        return acc;
      },
      {
        output: 0,
        savings: 0,
        payback: 0,
        capacity: 0,
        confidence: { high: 0, medium: 0, low: 0 },
        region: {} as Record<string, number>,
      },
    );

    const count = runs.length;
    const averagePayback = count > 0 ? totals.payback / count : 0;
    const capacityFactor =
      totals.capacity > 0 ? (totals.output / (totals.capacity * 8760)) * 100 : 0;

    const topSites = [...runs]
      .sort((a, b) => b.run.summary.annualSavingsUsd - a.run.summary.annualSavingsUsd)
      .slice(0, 6);

    const chartData = topSites.slice(0, 5).map((site) => ({
      name: shortName(site.name),
      output: Number(site.run.summary.annualOutputKwh.toFixed(2)),
      savings: Number(site.run.summary.annualSavingsUsd.toFixed(2)),
    }));

    const topRegion = Object.entries(totals.region).sort((a, b) => b[1] - a[1])[0] ?? null;

    return {
      allLocations: withRuns,
      filteredLocations: filtered,
      totalLocations: locations.length,
      analyzedLocations: count,
      totalOutput: totals.output,
      totalSavings: totals.savings,
      averagePayback,
      installedCapacity: totals.capacity,
      capacityFactor,
      confidence: totals.confidence,
      topSites,
      chartData,
      topRegion,
    };
  }, [locations, filters]);

  if (!isHydrated) {
    return (
      <div className="space-y-6 py-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Portfolio analytics</h1>
          <p className="text-sm text-muted-foreground">Loading saved portfolio insights...</p>
        </header>
      </div>
    );
  }

  if (filteredAndAnalyzed.analyzedLocations === 0) {
    return (
      <div className="space-y-6 py-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Portfolio analytics</h1>
          <p className="text-sm text-muted-foreground">
            {filteredAndAnalyzed.totalLocations === 0
              ? "Save a few analyses to unlock portfolio trends, confidence mix, and site benchmarks."
              : "No analyses match your current filters. Try adjusting them."}
          </p>
        </header>

        <AnalyticsFilterPanel />

        {filteredAndAnalyzed.totalLocations === 0 ? (
          <Card className="glass-card border-amber-200/50 bg-white/85">
            <CardHeader>
              <CardTitle>No portfolio data yet</CardTitle>
              <CardDescription>
                Run analysis on the Dashboard and save locations to populate this view.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button asChild className="bg-amber-400 text-foreground hover:bg-amber-500">
                <Link href="/dashboard">Analyze a Location</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/locations">Open Locations</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-amber-200/40 bg-white/85">
            <CardHeader>
              <CardTitle>Filters Active</CardTitle>
              <CardDescription>
                {filteredAndAnalyzed.totalLocations} locations available, but {filteredAndAnalyzed.totalLocations - filteredAndAnalyzed.analyzedLocations} don't match your filter criteria.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    );
  }

  const confidenceTotal = filteredAndAnalyzed.analyzedLocations;

  return (
    <div className="space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Portfolio analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio intelligence from {filteredAndAnalyzed.analyzedLocations} analyzed location{filteredAndAnalyzed.analyzedLocations !== 1 ? "s" : ""}
          {filteredAndAnalyzed.totalLocations > filteredAndAnalyzed.analyzedLocations
            ? ` (${filteredAndAnalyzed.totalLocations} total tracked)`
            : ""}.
        </p>
      </header>

      <Card className="glass-card border-sky-200/40 bg-white/85">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portfolio overview</CardTitle>
          <CardDescription>Aggregate insight from saved analyses.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>Total output: {filteredAndAnalyzed.totalOutput.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</span>
          <span>Annual savings: ${filteredAndAnalyzed.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span>Average payback: {filteredAndAnalyzed.averagePayback.toFixed(1)} years</span>
          <span>Installed capacity: {filteredAndAnalyzed.installedCapacity.toFixed(1)} kW</span>
        </CardContent>
      </Card>

      <AnalyticsFilterPanel />

      <AnalyticsComparisonView locations={filteredAndAnalyzed.filteredLocations} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-card border-amber-200/40">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <SunMedium className="h-4 w-4 text-amber-500" />
              Annual Output
            </CardDescription>
            <CardTitle className="text-2xl">{filteredAndAnalyzed.totalOutput.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass-card border-emerald-200/40">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Annual Savings
            </CardDescription>
            <CardTitle className="text-2xl">${filteredAndAnalyzed.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass-card border-sky-200/40">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-sky-500" />
              Capacity Factor
            </CardDescription>
            <CardTitle className="text-2xl">{filteredAndAnalyzed.capacityFactor.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass-card border-violet-200/40">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-violet-500" />
              Top Region
            </CardDescription>
            <CardTitle className="text-2xl capitalize">
              {filteredAndAnalyzed.topRegion ? filteredAndAnalyzed.topRegion[0] : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="glass-card border-sky-200/40 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-sky-500" />
              Top Sites by Annual Savings
            </CardTitle>
            <CardDescription>
              Compare annual output and annual savings across your strongest saved sites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="max-h-80 w-full">
              <BarChart data={filteredAndAnalyzed.chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="output" fill="var(--color-output)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="savings" fill="var(--color-savings)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-amber-200/40">
          <CardHeader>
            <CardTitle className="text-base">Confidence Distribution</CardTitle>
            <CardDescription>
              Mix of model confidence across {confidenceTotal} saved analyses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>High</span>
                <span>{filteredAndAnalyzed.confidence.high}</span>
              </div>
              <Progress value={(filteredAndAnalyzed.confidence.high / confidenceTotal) * 100} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Medium</span>
                <span>{filteredAndAnalyzed.confidence.medium}</span>
              </div>
              <Progress value={(filteredAndAnalyzed.confidence.medium / confidenceTotal) * 100} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Low</span>
                <span>{filteredAndAnalyzed.confidence.low}</span>
              </div>
              <Progress value={(filteredAndAnalyzed.confidence.low / confidenceTotal) * 100} />
            </div>

            <div className="pt-2 text-xs text-muted-foreground">
              Avg payback: {filteredAndAnalyzed.averagePayback.toFixed(2)} years. Installed capacity: {filteredAndAnalyzed.installedCapacity.toFixed(2)} kW.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-slate-200/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Location Benchmarks</span>
            {comparison.locationIds.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setComparisonActive(true)}
              >
                <Zap className="h-4 w-4 mr-1" />
                Compare ({comparison.locationIds.length})
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Sorted by annual savings. {comparison.locationIds.length > 0 ? "Check boxes to select sites for comparison." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {comparison.locationIds.length > 0 && <TableHead className="w-12"></TableHead>}
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Annual Output (kWh)</TableHead>
                <TableHead className="text-right">Annual Savings (USD)</TableHead>
                <TableHead className="text-right">Payback (Years)</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndAnalyzed.topSites.map((site) => (
                <TableRow key={site.id}>
                  {comparison.locationIds.length > 0 && (
                    <TableCell>
                      <Checkbox
                        checked={comparison.locationIds.includes(site.id)}
                        onCheckedChange={() => toggleComparisonLocation(site.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell className="text-right">
                    {site.run.summary.annualOutputKwh.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {site.run.summary.annualSavingsUsd.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                  <TableCell className="text-right">{site.run.summary.paybackYears.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {site.run.summary.confidence}
                    </Badge>
                  </TableCell>
                  <TableCell>{getRegionLabel(site.region)}</TableCell>
                  <TableCell>{site.run.summary.modelUsed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
