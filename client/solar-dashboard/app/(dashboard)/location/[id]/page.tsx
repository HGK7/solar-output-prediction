import { notFound } from "next/navigation";
import { MapPin, Calendar, Gauge, BatteryCharging } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LOCATION_DATA: Record<string, { name: string; installDate: string; capacityKw: number; storageKwh: number }> = {
  "bhadla-india": {
    name: "Bhadla, India",
    installDate: "2024-05-12",
    capacityKw: 5,
    storageKwh: 8,
  },
  "jaipur-india": {
    name: "Jaipur, India",
    installDate: "2024-08-01",
    capacityKw: 4.2,
    storageKwh: 6,
  },
};

export default async function LocationDetailPage(props: PageProps<"/location/[id]">) {
  const { id } = await props.params;
  const location = LOCATION_DATA[id];

  if (!location) {
    notFound();
  }

  return (
    <div className="space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Location Details</h1>
        <p className="text-sm text-muted-foreground">
          Installation profile, configuration, and readiness metrics.
        </p>
      </header>

      <Card className="rounded-2xl border-white/40 bg-white/70 shadow-md shadow-yellow-100/40 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400" />
            {location.name}
          </CardTitle>
          <CardDescription>Developer placeholder data until persistence is connected.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/40 bg-white/60 p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" />
              Capacity
            </p>
            <p className="text-lg font-semibold">{location.capacityKw.toFixed(1)} kW</p>
          </div>
          <div className="rounded-xl border border-white/40 bg-white/60 p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <BatteryCharging className="h-3.5 w-3.5" />
              Storage
            </p>
            <p className="text-lg font-semibold">{location.storageKwh.toFixed(1)} kWh</p>
          </div>
          <div className="rounded-xl border border-white/40 bg-white/60 p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Installation Date
            </p>
            <p className="text-lg font-semibold">{location.installDate}</p>
          </div>
        </CardContent>
      </Card>

      <Badge variant="secondary" className="w-fit">Route: /location/{id}</Badge>
    </div>
  );
}
