import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  lat: number;
  lon: number;
  capacityKw: number;
}

export function DashboardHeader({
  title,
  subtitle,
  lat,
  lon,
  capacityKw,
}: DashboardHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Lat {lat.toFixed(3)}</Badge>
          <Badge variant="outline">Lon {lon.toFixed(3)}</Badge>
          <Badge variant="secondary">{capacityKw.toFixed(1)} kW</Badge>
        </div>
      </div>
    </header>
  );
}
