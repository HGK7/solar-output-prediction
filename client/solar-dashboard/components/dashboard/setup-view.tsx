import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SystemConfigPanel, type SystemConfig } from "@/components/system-config-panel";
import { MapPin, ChartNoAxesColumn } from "lucide-react";

interface SetupViewProps {
  lat: number;
  lon: number;
  isLoading: boolean;
  systemConfig: SystemConfig;
  annualAverages: Record<string, number> | null;
  stage: string;
  showEmptyState: boolean;
  onLatChange: (next: number) => void;
  onLonChange: (next: number) => void;
  onSystemConfigChange: (next: SystemConfig) => void;
  onAnalyze: () => void;
  LocationMapComponent: React.ComponentType<{
    lat: number;
    lon: number;
    onLocationChange: (lat: number, lon: number) => void;
    disabled?: boolean;
  }>;
}

export function SetupView({
  lat,
  lon,
  isLoading,
  systemConfig,
  annualAverages,
  stage,
  showEmptyState,
  onLatChange,
  onLonChange,
  onSystemConfigChange,
  onAnalyze,
  LocationMapComponent,
}: SetupViewProps) {
  return (
    <>
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-400" />
            Select location
          </h2>
          <p className="text-sm text-muted-foreground">
            Search for a city to zoom, then click the map or drag the pin for precise coordinates.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <LocationMapComponent
            lat={lat}
            lon={lon}
            onLocationChange={(nextLat, nextLon) => {
              onLatChange(nextLat);
              onLonChange(nextLon);
            }}
            disabled={isLoading}
          />
        </div>
      </section>

      <section className="space-y-6">
        <SystemConfigPanel
          value={systemConfig}
          onChange={onSystemConfigChange}
          lat={lat}
          lon={lon}
          onLatChange={onLatChange}
          onLonChange={onLonChange}
          disabled={isLoading}
        />

        <div className="flex justify-center">
          <Button
            className="w-full max-w-xs bg-amber-400 text-foreground shadow-md shadow-amber-200/40 hover:bg-amber-500"
            onClick={onAnalyze}
            disabled={isLoading}
          >
            {isLoading ? "Analyzing..." : "Analyze solar potential"}
          </Button>
        </div>

        <Card className="glass-card border-sky-200/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ChartNoAxesColumn className="h-4 w-4 text-sky-400" />
              Location average solar inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stage === "location" && !annualAverages ? (
              <>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : annualAverages ? (
              <div className="space-y-1 text-muted-foreground">
                <p>
                  Temperature: <span className="font-medium text-foreground">{annualAverages.Temperature?.toFixed(2)} C</span>
                </p>
                <p>
                  Humidity: <span className="font-medium text-foreground">{annualAverages.Humidity?.toFixed(2)} %</span>
                </p>
                <p>
                  Wind Speed: <span className="font-medium text-foreground">{annualAverages["Wind Speed"]?.toFixed(2)} m/s</span>
                </p>
                <p>
                  Clear Sky Irradiance: <span className="font-medium text-foreground">{annualAverages["Clear Sky Irradiance"]?.toFixed(2)} kWh/m2/day</span>
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Run analysis to load local averages.</p>
            )}
          </CardContent>
        </Card>

        {showEmptyState && (
          <Card className="glass-card border-amber-200/50 bg-linear-to-br from-amber-50/40 via-white/90 to-sky-50/40">
            <CardHeader>
              <CardTitle>Start your first analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Set your location, confirm system configuration, and run analysis.</p>
              <p>Results will show prediction, engineering check, costs, and explanation.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}
