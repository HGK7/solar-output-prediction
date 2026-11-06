"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/bento";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteDashboard } from "@/components/locations/site-dashboard";
import { useLocationsStore } from "@/lib/locations-store";
import { queueReanalysisIntent } from "@/lib/reanalysis-intent";
import type { RunViewMode } from "@/components/locations/location-run-toolbar";

export function LocationDetailClient({ locationId }: { locationId: string }) {
  const router = useRouter();
  const { isHydrated, locations, getLocationById, upsertLocation } = useLocationsStore();
  // Switching sites updates state + URL in place; router.push would remount the page and flash the skeleton.
  const [siteId, setSiteId] = useState(locationId);
  const location = siteId ? getLocationById(siteId) : null;

  const [mode, setMode] = useState<RunViewMode>("single");
  const [baseRunId, setBaseRunId] = useState("");
  const [compareRunId, setCompareRunId] = useState("");
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const orderedRuns = useMemo(() => {
    if (!location) return [];
    return [...location.runs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [location]);

  const runNumberById = useMemo(() => {
    const map = new Map<string, number>();
    const asc = [...orderedRuns].reverse();
    asc.forEach((run, index) => {
      map.set(run.id, index + 1);
    });
    return map;
  }, [orderedRuns]);

  useEffect(() => {
    if (!orderedRuns.length) {
      setBaseRunId("");
      setCompareRunId("");
      return;
    }

    setBaseRunId((prev) =>
      orderedRuns.some((r) => r.id === prev) ? prev : orderedRuns[0].id,
    );
    setCompareRunId((prev) =>
      orderedRuns.some((r) => r.id === prev)
        ? prev
        : (orderedRuns[1]?.id ?? orderedRuns[0].id),
    );

    if (orderedRuns.length < 2 && mode === "compare") {
      setMode("single");
    }
  }, [orderedRuns, mode]);

  if (!isHydrated) {
    return (
      <div className="space-y-3 border-b border-[#E6E3DC] bg-[#FEFDFB] p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="space-y-6 p-6">
        <ErrorState
          title="Location not found."
          message="This location is not in your saved workspace."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/locations">
                <ArrowLeft className="size-4" />
                Back to locations
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const handleLaunchNewRun = () => {
    // New runs start from the site defaults edited in Edit Site.
    queueReanalysisIntent({
      locationId: location.id,
      locationName: location.name,
      lat: location.coordinates.lat,
      lon: location.coordinates.lon,
      systemConfig: location.systemConfig,
      requestedAt: Date.now(),
    });
    router.push("/dashboard");
  };

  return (
    <SiteDashboard
      location={location}
      sites={locations.map((l) => ({ id: l.id, name: l.name }))}
      onSelectSite={(id) => {
        setEditDrawerOpen(false);
        setSiteId(id);
        window.history.pushState(null, "", `/location/${id}`);
      }}
      orderedRuns={orderedRuns}
      runNumberById={runNumberById}
      mode={mode}
      onModeChange={setMode}
      baseRunId={baseRunId}
      compareRunId={compareRunId}
      onBaseRunIdChange={setBaseRunId}
      onCompareRunIdChange={setCompareRunId}
      editDrawerOpen={editDrawerOpen}
      onEditDrawerOpenChange={setEditDrawerOpen}
      onLaunchNewRun={handleLaunchNewRun}
      onSaveLocation={(next) => {
        upsertLocation(next);
        toast.success("Location updated");
      }}
    />
  );
}
