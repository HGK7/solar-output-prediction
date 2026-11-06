"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  SavedGridConnection,
  SavedInstallationType,
  SavedLocationMetadata,
  SavedLocationRecord,
  SavedPanelTechnology,
  SavedRegionType,
  SavedSystemConfig,
} from "@/types";

interface LocationEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: SavedLocationRecord;
  onSaveLocation: (nextRecord: SavedLocationRecord) => void;
}

type LocationFormState = {
  name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  systemConfig: SavedSystemConfig;
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

export function LocationEditDrawer({
  open,
  onOpenChange,
  location,
  onSaveLocation,
}: LocationEditDrawerProps) {
  const [form, setForm] = useState<LocationFormState>(() => createFormState(location));
  const [tagsInput, setTagsInput] = useState(() => location.metadata.tags.join(", "));
  const [tariffDraft, setTariffDraft] = useState(() =>
    formatDecimalInput(location.systemConfig.electricityTariffUsd),
  );
  const [performanceDraft, setPerformanceDraft] = useState(() =>
    formatDecimalInput(location.systemConfig.performanceRatio),
  );
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const nextForm = createFormState(location);
    setForm(nextForm);
    setTagsInput(nextForm.metadata.tags.join(", "));
    setTariffDraft(formatDecimalInput(nextForm.systemConfig.electricityTariffUsd));
    setPerformanceDraft(formatDecimalInput(nextForm.systemConfig.performanceRatio));
    setSaveStatus(null);
  }, [location, open]);

  const commitTariff = () => {
    const next = clampNumber(Number(tariffDraft), 0.01, 5);
    setTariffDraft(formatDecimalInput(next));
    setForm((current) => ({
      ...current,
      systemConfig: {
        ...current.systemConfig,
        electricityTariffUsd: next,
      },
    }));
  };

  const commitPerformanceRatio = () => {
    const next = clampNumber(Number(performanceDraft), 0.4, 0.95);
    setPerformanceDraft(formatDecimalInput(next));
    setForm((current) => ({
      ...current,
      systemConfig: {
        ...current.systemConfig,
        performanceRatio: next,
      },
    }));
  };

  const handleCommitKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void,
  ) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      commit();
    }
  };

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify({
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
      })
    );
  }, [form, location, tagsInput]);

  const trimmedLocationName = form.name.trim();
  const canSave = hasChanges && trimmedLocationName.length > 0;

  const handleSave = () => {
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
        systemCapacityKw: clampNumber(form.systemConfig.systemCapacityKw, 0.5, 5000),
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

    onSaveLocation(nextRecord);
    setSaveStatus("Location updated.");
    onOpenChange(false);
  };

  const handleReset = () => {
    const nextForm = createFormState(location);
    setForm(nextForm);
    setTagsInput(nextForm.metadata.tags.join(", "));
    setTariffDraft(formatDecimalInput(nextForm.systemConfig.electricityTariffUsd));
    setPerformanceDraft(formatDecimalInput(nextForm.systemConfig.performanceRatio));
    setSaveStatus("Changes reset.");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-tile-border bg-tile sm:max-w-lg"
      >
        <SheetHeader className="border-b border-tile-border pb-4">
          <SheetTitle>Edit Site &amp; Defaults</SheetTitle>
          <SheetDescription>
            Update site metadata, coordinates, and default hardware configuration for future re-analysis runs.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="drawer-location-name">Location Name</Label>
              <Input
                id="drawer-location-name"
                value={form.name}
                required
                aria-invalid={trimmedLocationName.length === 0}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-owner-name">Owner / Contact</Label>
              <Input
                id="drawer-owner-name"
                value={form.metadata.ownerName}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    metadata: { ...c.metadata, ownerName: e.target.value },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-installation-date">Installation Date</Label>
              <Input
                id="drawer-installation-date"
                type="date"
                value={form.metadata.installationDate ?? ""}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    metadata: {
                      ...c.metadata,
                      installationDate: e.target.value || null,
                    },
                  }))
                }
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="drawer-tag-list">Tags (comma-separated)</Label>
              <Input
                id="drawer-tag-list"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="roof, commercial, phase-1"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="drawer-location-notes">Notes</Label>
              <Textarea
                id="drawer-location-notes"
                value={form.metadata.notes}
                rows={3}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    metadata: { ...c.metadata, notes: e.target.value },
                  }))
                }
                placeholder="Operational notes, shading constraints, roof access..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-latitude">Latitude</Label>
              <Input
                id="drawer-latitude"
                type="number"
                value={form.coordinates.lat}
                readOnly
                aria-describedby="drawer-coordinates-note"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-longitude">Longitude</Label>
              <Input
                id="drawer-longitude"
                type="number"
                value={form.coordinates.lon}
                readOnly
                aria-describedby="drawer-coordinates-note"
              />
            </div>
            <p id="drawer-coordinates-note" className="text-xs text-muted-foreground sm:col-span-2">
              Coordinates stay fixed so saved runs match this site. Save a new site to plan
              somewhere else. Defaults below are used for the next New Run.
            </p>

            <div className="space-y-2">
              <Label htmlFor="drawer-installation-type">Installation Type</Label>
              <Select
                value={form.systemConfig.installationType}
                onValueChange={(value) =>
                  setForm((c) => ({
                    ...c,
                    systemConfig: {
                      ...c.systemConfig,
                      installationType: value as SavedInstallationType,
                    },
                  }))
                }
              >
                <SelectTrigger id="drawer-installation-type" className="w-full">
                  <SelectValue placeholder="Select installation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rooftop">Rooftop</SelectItem>
                  <SelectItem value="ground-mounted">Ground-Mounted</SelectItem>
                  <SelectItem value="carport">Carport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-panel-technology">Panel Technology</Label>
              <Select
                value={form.systemConfig.panelTechnology}
                onValueChange={(value) =>
                  setForm((c) => ({
                    ...c,
                    systemConfig: {
                      ...c.systemConfig,
                      panelTechnology: value as SavedPanelTechnology,
                    },
                  }))
                }
              >
                <SelectTrigger id="drawer-panel-technology" className="w-full">
                  <SelectValue placeholder="Select panel technology" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monocrystalline">Monocrystalline</SelectItem>
                  <SelectItem value="polycrystalline">Polycrystalline</SelectItem>
                  <SelectItem value="thin-film">Thin-film</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-grid-connection">Grid Connection</Label>
              <Select
                value={form.systemConfig.gridConnection}
                onValueChange={(value) =>
                  setForm((c) => ({
                    ...c,
                    systemConfig: {
                      ...c.systemConfig,
                      gridConnection: value as SavedGridConnection,
                    },
                  }))
                }
              >
                <SelectTrigger id="drawer-grid-connection" className="w-full">
                  <SelectValue placeholder="Select grid connection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid-tied">Grid-tied</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="off-grid">Off-grid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-region">Region</Label>
              <Select
                value={form.systemConfig.region}
                onValueChange={(value) =>
                  setForm((c) => ({
                    ...c,
                    systemConfig: {
                      ...c.systemConfig,
                      region: value as SavedRegionType,
                    },
                  }))
                }
              >
                <SelectTrigger id="drawer-region" className="w-full">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="usa">USA</SelectItem>
                  <SelectItem value="europe">Europe</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-system-capacity">Default Capacity (kW)</Label>
              <Input
                id="drawer-system-capacity"
                type="number"
                step={0.1}
                value={form.systemConfig.systemCapacityKw}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    systemConfig: {
                      ...c.systemConfig,
                      systemCapacityKw: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawer-tariff">Electricity Tariff (USD/kWh)</Label>
              <Input
                id="drawer-tariff"
                type="text"
                inputMode="decimal"
                value={tariffDraft}
                onChange={(e) => setTariffDraft(e.target.value)}
                onBlur={commitTariff}
                onKeyDown={(e) => handleCommitKeyDown(e, commitTariff)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="drawer-performance-ratio">Performance Ratio (0.40 – 0.95)</Label>
              <Input
                id="drawer-performance-ratio"
                type="text"
                inputMode="decimal"
                value={performanceDraft}
                onChange={(e) => setPerformanceDraft(e.target.value)}
                onBlur={commitPerformanceRatio}
                onKeyDown={(e) => handleCommitKeyDown(e, commitPerformanceRatio)}
              />
            </div>
          </div>

          <div aria-live="polite" className="min-h-5">
            {saveStatus ? (
              <p className="text-xs text-muted-foreground">{saveStatus}</p>
            ) : null}
            {hasChanges && !trimmedLocationName ? (
              <p className="text-xs text-status-error">
                Location name is required before saving.
              </p>
            ) : null}
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-tile-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
