"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioView } from "@/components/locations/portfolio-view";
import { useLocationsStore } from "@/lib/locations-store";

/** Analytics surface = portfolio yield benchmark (design Phase 5). */
export default function AnalyticsPage() {
  const { locations, isHydrated } = useLocationsStore();

  if (!isHydrated) {
    return (
      <div className="space-y-3 border-b border-[#E6E3DC] bg-[#18181B] p-6">
        <Skeleton className="h-8 w-80 bg-white/10" />
        <Skeleton className="h-4 w-96 bg-white/10" />
      </div>
    );
  }

  return <PortfolioView locations={locations} initialView="benchmark" />;
}
