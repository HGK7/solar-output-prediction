import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DEMO_LOCATIONS = [
  { id: "bhadla-india", name: "Bhadla, India", capacityKw: 5.0 },
  { id: "jaipur-india", name: "Jaipur, India", capacityKw: 4.2 },
];

export default function LocationsPage() {
  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Track solar installations across multiple locations.
          </p>
        </div>
        <Button className="bg-amber-400 text-foreground hover:bg-amber-500">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {DEMO_LOCATIONS.map((location) => (
          <Card key={location.id} className="rounded-2xl border-white/40 bg-white/70 shadow-md shadow-yellow-100/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                {location.name}
              </CardTitle>
              <CardDescription>System setup and historical output tracking.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <Badge variant="secondary">{location.capacityKw.toFixed(1)} kW</Badge>
              <Button asChild variant="outline" size="sm">
                <Link href={`/location/${location.id}`}>View Details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
