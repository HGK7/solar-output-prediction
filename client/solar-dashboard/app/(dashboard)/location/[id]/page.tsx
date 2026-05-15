"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, ChartNoAxesColumn, Gauge, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocationsStore } from "@/lib/locations-store";
import type { SavedLocationMetadata, SavedLocationRecord } from "@/types";
import type { SystemConfig } from "@/components/system-config-panel";

type LocationFormState = {
  name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  systemConfig: SystemConfig;
  metadata: SavedLocationMetadata;
};

const DEFAULT_METADATA: SavedLocationMetadata = {
  ownerName: "",
  installationDate: null,
  notes: "",
  tags: [],
};

function createFormState(location: SavedLocationRecord): LocationFormState {
  return {
    name: location.name,
    coordinates: { ...location.coordinates },
    systemConfig: { ...location.systemConfig },
    metadata: {
      ...DEFAULT_METADATA,
      ...location.metadata,
      tags: [...location.metadata.tags],
    },
  };
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatDecimalInput(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

export default function LocationDetailPage() {
  const params = useParams<{ id: string }>();
  const locationId = params?.id;
  const { isHydrated, getLocationById, upsertLocation } = useLocationsStore();
  const location = locationId ? getLocationById(locationId) : null;
  const [form, setForm] = useState<LocationFormState | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [tariffDraft, setTariffDraft] = useState("");
  const [performanceDraft, setPerformanceDraft] = useState("");

  useEffect(() => {
    if (!location) {
      setForm(null);
      setTagsInput("");
      return;
    }

    const nextForm = createFormState(location);
    setForm(nextForm);
    setTagsInput(nextForm.metadata.tags.join(", "));
    setTariffDraft(formatDecimalInput(nextForm.systemConfig.electricityTariffUsd));
    setPerformanceDraft(formatDecimalInput(nextForm.systemConfig.performanceRatio));
    setSaveStatus(null);
  }, [location]);

  const commitTariff = () => {
    if (!form) return;
    const next = clampNumber(Number(tariffDraft), 0.01, 10);
    setTariffDraft(formatDecimalInput(next));
    setForm((current) =>
      current
        ? {
          ...current,
          systemConfig: {
            ...current.systemConfig,
            electricityTariffUsd: next,
          },
        }
        : current,
    );
  };

  const commitPerformanceRatio = () => {
    if (!form) return;
    const next = clampNumber(Number(performanceDraft), 0.1, 0.99);
    setPerformanceDraft(formatDecimalInput(next));
    setForm((current) =>
      current
        ? {
          ...current,
          systemConfig: {
            ...current.systemConfig,
            performanceRatio: next,
          },
        }
        : current,
    );
  };

  const handleCommitKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, commit: () => void) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      commit();
    }
  };

  const hasChanges = useMemo(() => {
    if (!location || !form) return false;

    return JSON.stringify({
      name: location.name,
      coordinates: location.coordinates,
      systemConfig: location.systemConfig,
      metadata: location.metadata,
    }) !==
      JSON.stringify({
        name: form.name,
        coordinates: form.coordinates,
        systemConfig: form.systemConfig,
        metadata: {
          ...form.metadata,
          tags: parseTags(tagsInput),
        },
      });
  }, [form, location, tagsInput]);

  const trimmedLocationName = form?.name.trim() ?? "";
  const canSave = hasChanges && trimmedLocationName.length > 0;

  const handleSave = () => {
    if (!location || !form) return;

    const nextName = form.name.trim();
    if (!nextName) {
      setSaveStatus("Location name is required.");
      return;
    }

    const nextRecord: SavedLocationRecord = {
      ...location,
      name: nextName,
      coordinates: {
        lat: clampNumber(form.coordinates.lat, -90, 90),
        lon: clampNumber(form.coordinates.lon, -180, 180),
      },
      systemConfig: {
        ...form.systemConfig,
        systemCapacityKw: clampNumber(form.systemConfig.systemCapacityKw, 0.1, 1000),
        electricityTariffUsd: clampNumber(form.systemConfig.electricityTariffUsd, 0.01, 10),
        performanceRatio: clampNumber(form.systemConfig.performanceRatio, 0.1, 0.99),
      },
      metadata: {
        ...form.metadata,
        ownerName: form.metadata.ownerName.trim(),
        notes: form.metadata.notes.trim(),
        tags: parseTags(tagsInput),
      },
      updatedAt: new Date().toISOString(),
    };

    upsertLocation(nextRecord);
    setSaveStatus("Location updated.");
  };

  if (!isHydrated) {
    return (
      <div className="space-y-6 py-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Location Details</h1>
          <p className="text-sm text-muted-foreground">Loading saved location data...</p>
        </header>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="space-y-6 py-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Location Not Found</h1>
          <p className="text-sm text-muted-foreground">
            This location does not exist in your saved workspace.
          </p>
        </header>

        <Button asChild variant="outline">
          <Link href="/locations">
            <ArrowLeft className="h-4 w-4" />
            Back to Locations
          </Link>
        </Button>
      </div>
    );
  }

  const latestRun = location.latestRun;

  return (
    <div className="space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Location Details</h1>
        <p className="text-sm text-muted-foreground">
          Saved site profile and latest analysis snapshot.
        </p>
      </header>

      <Card className="rounded-2xl border-white/40 bg-white/70 shadow-md shadow-yellow-100/40 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400" />
            Edit Location
          </CardTitle>
          <CardDescription>
            Update the name, coordinates, system configuration, and any site metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {form && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  value={form.name}
                  required
                  aria-invalid={trimmedLocationName.length === 0}
                  onChange={(e) => {
                    setForm((current) => (current ? { ...current, name: e.target.value } : current));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-name">Owner / Contact</Label>
                <Input
                  id="owner-name"
                  value={form.metadata.ownerName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm((current) =>
                      current
                        ? { ...current, metadata: { ...current.metadata, ownerName: next } }
                        : current,
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installation-date">Installation Date</Label>
                <Input
                  id="installation-date"
                  type="date"
                  value={form.metadata.installationDate ?? ""}
                  onChange={(e) => {
                    const next = e.target.value || null;
                    setForm((current) =>
                      current
                        ? { ...current, metadata: { ...current.metadata, installationDate: next } }
                        : current,
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag-list">Tags</Label>
                <Input
                  id="tag-list"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="roof, school, retrofit"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="location-notes">Notes</Label>
                <textarea
                  id="location-notes"
                  value={form.metadata.notes}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm((current) =>
                      current
                        ? { ...current, metadata: { ...current.metadata, notes: next } }
                        : current,
                    );
                  }}
                  rows={4}
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="Operational notes, site constraints, maintenance reminders..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step={0.0001}
                  value={form.coordinates.lat}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setForm((current) =>
                      current
                        ? { ...current, coordinates: { ...current.coordinates, lat: next } }
                        : current,
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step={0.0001}
                  value={form.coordinates.lon}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setForm((current) =>
                      current
                        ? { ...current, coordinates: { ...current.coordinates, lon: next } }
                        : current,
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installation-type">Installation Type</Label>
                <select
                  id="installation-type"
                  value={form.systemConfig.installationType}
                  onChange={(e) => {
                    const installationType = e.target.value as SystemConfig["installationType"];
                    setForm((current) =>
                      current
                        ? { ...current, systemConfig: { ...current.systemConfig, installationType } }
                        : current,
                    );
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="rooftop">Rooftop</option>
                  <option value="ground-mounted">Ground-Mounted</option>
                  <option value="carport">Carport</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="panel-technology">Panel Technology</Label>
                <select
                  id="panel-technology"
                  value={form.systemConfig.panelTechnology}
                  onChange={(e) => {
                    const panelTechnology = e.target.value as SystemConfig["panelTechnology"];
                    setForm((current) =>
                      current
                        ? { ...current, systemConfig: { ...current.systemConfig, panelTechnology } }
                        : current,
                    );
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="monocrystalline">Monocrystalline</option>
                  <option value="polycrystalline">Polycrystalline</option>
                  <option value="thin-film">Thin-film</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grid-connection">Grid Connection</Label>
                <select
                  id="grid-connection"
                  value={form.systemConfig.gridConnection}
                  onChange={(e) => {
                    const gridConnection = e.target.value as SystemConfig["gridConnection"];
                    setForm((current) =>
                      current
                        ? { ...current, systemConfig: { ...current.systemConfig, gridConnection } }
                        : current,
                    );
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="grid-tied">Grid-tied</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="off-grid">Off-grid</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  value={form.systemConfig.region}
                  onChange={(e) => {
                    const region = e.target.value as SystemConfig["region"];
                    setForm((current) =>
                      current
                        ? { ...current, systemConfig: { ...current.systemConfig, region } }
                        : current,
                    );
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="india">India</option>
                  <option value="usa">USA</option>
                  <option value="europe">Europe</option>
                  <option value="global">Global</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system-capacity">System Capacity (kW)</Label>
                <Input
                  id="system-capacity"
                  type="number"
                  step={0.1}
                  value={form.systemConfig.systemCapacityKw}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setForm((current) =>
                      current
                        ? {
                          ...current,
                          systemConfig: {
                            ...current.systemConfig,
                            systemCapacityKw: next,
                          },
                        }
                        : current,
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tariff">Electricity Tariff (USD/kWh)</Label>
                <Input
                  id="tariff"
                  type="text"
                  inputMode="decimal"
                  value={tariffDraft}
                  onChange={(e) => setTariffDraft(e.target.value)}
                  onBlur={commitTariff}
                  onKeyDown={(event) => handleCommitKeyDown(event, commitTariff)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="performance-ratio">Performance Ratio</Label>
                <Input
                  id="performance-ratio"
                  type="text"
                  inputMode="decimal"
                  value={performanceDraft}
                  onChange={(e) => setPerformanceDraft(e.target.value)}
                  onBlur={commitPerformanceRatio}
                  onKeyDown={(event) => handleCommitKeyDown(event, commitPerformanceRatio)}
                />
              </div>

              <div className="lg:col-span-2 flex flex-wrap items-center gap-2">
                <Button className="bg-amber-400 text-foreground hover:bg-amber-500" onClick={handleSave} disabled={!canSave}>
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!location) return;
                    const nextForm = createFormState(location);
                    setForm(nextForm);
                    setTagsInput(nextForm.metadata.tags.join(", "));
                    setSaveStatus("Changes reset.");
                  }}
                  disabled={!hasChanges}
                >
                  Reset
                </Button>
                {saveStatus && <p className="text-sm text-muted-foreground">{saveStatus}</p>}
                {hasChanges && !trimmedLocationName && (
                  <p className="text-xs text-muted-foreground">Location name is required before saving.</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/40 bg-white/60 p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" />
                Capacity
              </p>
              <p className="text-lg font-semibold">{location.systemConfig.systemCapacityKw.toFixed(1)} kW</p>
            </div>
            <div className="rounded-xl border border-white/40 bg-white/60 p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ChartNoAxesColumn className="h-3.5 w-3.5" />
                Panel Technology
              </p>
              <p className="text-lg font-semibold capitalize">{location.systemConfig.panelTechnology}</p>
            </div>
            <div className="rounded-xl border border-white/40 bg-white/60 p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Last Updated
              </p>
              <p className="text-lg font-semibold">{new Date(location.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {location.systemConfig.installationType}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {location.systemConfig.gridConnection}
            </Badge>
            {location.metadata.ownerName && <Badge variant="outline">Owner: {location.metadata.ownerName}</Badge>}
            {location.metadata.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/40 bg-white/70 shadow-md shadow-yellow-100/40 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Latest Analysis</CardTitle>
          <CardDescription>
            Most recent saved run for this location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestRun ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/40 bg-white/60 p-3">
                  <p className="text-xs text-muted-foreground">Annual Output</p>
                  <p className="text-lg font-semibold">{latestRun.summary.annualOutputKwh.toLocaleString()} kWh</p>
                </div>
                <div className="rounded-xl border border-white/40 bg-white/60 p-3">
                  <p className="text-xs text-muted-foreground">Annual Savings</p>
                  <p className="text-lg font-semibold">${latestRun.summary.annualSavingsUsd.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-white/40 bg-white/60 p-3">
                  <p className="text-xs text-muted-foreground">Simple Payback</p>
                  <p className="text-lg font-semibold">{latestRun.summary.paybackYears} years</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Confidence: {latestRun.summary.confidence}</Badge>
                <Badge variant="outline" className="capitalize">
                  Model: {latestRun.summary.modelUsed.replaceAll("_", " ")}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No saved analysis run for this location yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/locations">
            <ArrowLeft className="h-4 w-4" />
            Back to Locations
          </Link>
        </Button>
        <Button asChild className="bg-amber-400 text-foreground hover:bg-amber-500">
          <Link href="/dashboard">Open Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
