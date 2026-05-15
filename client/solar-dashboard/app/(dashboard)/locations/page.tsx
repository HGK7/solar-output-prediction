"use client";

import Link from "next/link";
import { MapPin, Plus, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocationsStore } from "@/lib/locations-store";

export default function LocationsPage() {
  const { locations, isHydrated } = useLocationsStore();
  const analyzedCount = locations.filter((location) => location.latestRun).length;

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Review saved solar analyses and revisit each site workspace.
          </p>
        </div>
        <Button asChild className="bg-amber-400 text-foreground hover:bg-amber-500">
          <Link href="/dashboard">
            <Plus className="h-4 w-4" />
            New Analysis
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="glass-card border-amber-200/40 bg-white/85">
          <CardHeader className="pb-2">
            <CardDescription>Total locations</CardDescription>
            <CardTitle className="text-2xl">{locations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-sky-200/40 bg-white/85">
          <CardHeader className="pb-2">
            <CardDescription>Analyzed sites</CardDescription>
            <CardTitle className="text-2xl">{analyzedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-emerald-200/40 bg-white/85">
          <CardHeader className="pb-2">
            <CardDescription>Ready to compare</CardDescription>
            <CardTitle className="text-2xl">{Math.max(analyzedCount - 1, 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!isHydrated ? (
        <Card className="glass-card border-amber-200/40 bg-white/85">
          <CardContent className="py-8 text-sm text-muted-foreground">Loading saved locations...</CardContent>
        </Card>
      ) : locations.length === 0 ? (
        <Card className="glass-card border-amber-200/40 bg-white/85">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SunMedium className="h-5 w-5 text-amber-500" />
              No saved locations yet
            </CardTitle>
            <CardDescription>
              Run an analysis on the dashboard and click Save Analysis to create your first location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-amber-400 text-foreground hover:bg-amber-500">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {locations.map((location) => {
            const latest = location.latestRun;

            return (
              <Card key={location.id} className="glass-card border-slate-200/40 bg-white/85">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-sky-400" />
                    {location.name}
                  </CardTitle>
                  <CardDescription>
                    {location.coordinates.lat.toFixed(4)}, {location.coordinates.lon.toFixed(4)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {location.metadata.ownerName && <Badge variant="outline">Owner: {location.metadata.ownerName}</Badge>}
                    {location.metadata.installationDate && (
                      <Badge variant="outline">
                        Installed: {new Date(location.metadata.installationDate).toLocaleDateString()}
                      </Badge>
                    )}
                    {location.metadata.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{location.systemConfig.systemCapacityKw.toFixed(1)} kW</Badge>
                    <Badge variant="outline" className="capitalize">
                      {location.systemConfig.panelTechnology}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {location.systemConfig.gridConnection}
                    </Badge>
                  </div>

                  {latest ? (
                    <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm text-muted-foreground">
                      <p>
                        Annual Output: <span className="font-medium text-foreground">{latest.summary.annualOutputKwh.toLocaleString()} kWh</span>
                      </p>
                      <p>
                        Annual Savings: <span className="font-medium text-foreground">${latest.summary.annualSavingsUsd.toLocaleString()}</span>
                      </p>
                      <p>
                        Payback: <span className="font-medium text-foreground">{latest.summary.paybackYears} years</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No run attached yet.</p>
                  )}

                  <Button asChild variant="outline" size="sm">
                    <Link href={`/location/${location.id}`}>View / Edit Details</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
