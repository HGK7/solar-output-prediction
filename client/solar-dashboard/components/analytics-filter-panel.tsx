"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAnalyticsFilters, type RegionType, type ConfidenceLevel } from "@/lib/analytics-context";

const REGIONS: RegionType[] = ["india", "usa", "europe", "global"];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["high", "medium", "low"];

export function AnalyticsFilterPanel() {
  const {
    filters,
    updateFilters,
    resetFilters,
    getRegionLabel,
    comparison,
    toggleComparisonLocation,
    setComparisonActive,
  } = useAnalyticsFilters();

  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.dateRange.from || filters.dateRange.to ? 1 : 0,
    filters.regions.length > 0 && !filters.includeAllRegions ? 1 : 0,
    filters.confidenceMin !== "low" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleDateFromChange = (date: Date | undefined) => {
    updateFilters({
      dateRange: { ...filters.dateRange, from: date || null },
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    updateFilters({
      dateRange: { ...filters.dateRange, to: date || null },
    });
  };

  const handleRegionToggle = (region: RegionType) => {
    const newRegions = filters.regions.includes(region)
      ? filters.regions.filter((r) => r !== region)
      : [...filters.regions, region];
    updateFilters({
      regions: newRegions,
      includeAllRegions: newRegions.length === 0,
    });
  };

  const handleConfidenceChange = (level: ConfidenceLevel) => {
    updateFilters({ confidenceMin: level });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4" align="start">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium mb-2">Date Range</h3>
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2 text-left">
                        <Calendar className="h-4 w-4" />
                        {filters.dateRange.from
                          ? format(filters.dateRange.from, "MMM d, yyyy")
                          : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.from ?? undefined}
                        onSelect={handleDateFromChange}
                        disabled={(date) =>
                          filters.dateRange.to ? date > filters.dateRange.to : false
                        }
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2 text-left">
                        <Calendar className="h-4 w-4" />
                        {filters.dateRange.to
                          ? format(filters.dateRange.to, "MMM d, yyyy")
                          : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateRange.to ?? undefined}
                        onSelect={handleDateToChange}
                        disabled={(date) =>
                          filters.dateRange.from ? date < filters.dateRange.from : false
                        }
                      />
                    </PopoverContent>
                  </Popover>

                  {(filters.dateRange.from || filters.dateRange.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() =>
                        updateFilters({
                          dateRange: { from: null, to: null },
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                      Clear dates
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Regions</h3>
                <div className="space-y-2">
                  {REGIONS.map((region) => (
                    <div key={region} className="flex items-center gap-2">
                      <Checkbox
                        id={`region-${region}`}
                        checked={filters.regions.includes(region)}
                        onCheckedChange={() => handleRegionToggle(region)}
                      />
                      <Label
                        htmlFor={`region-${region}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {getRegionLabel(region)}
                      </Label>
                    </div>
                  ))}
                  {filters.regions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 mt-2"
                      onClick={() =>
                        updateFilters({
                          regions: [],
                          includeAllRegions: true,
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                      Clear regions
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Minimum Confidence</h3>
                <Select value={filters.confidenceMin} onValueChange={handleConfidenceChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIDENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {comparison.locationIds.length > 0 && (
        <Card className="glass-card border-amber-200/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Comparison Mode
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setComparisonActive(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {comparison.locationIds.length} location{comparison.locationIds.length !== 1 ? "s" : ""} selected
            (max 4)
          </CardContent>
        </Card>
      )}
    </div>
  );
}
