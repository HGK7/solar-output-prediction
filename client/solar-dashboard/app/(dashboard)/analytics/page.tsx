import { BarChart3, DollarSign, SunMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const METRICS = [
  {
    title: "Projected Annual Output",
    value: "8,420 kWh",
    note: "Based on current placeholder model inputs",
    icon: SunMedium,
  },
  {
    title: "Estimated Annual Savings",
    value: "$1,124",
    note: "Tariff-aware cost estimate",
    icon: DollarSign,
  },
  {
    title: "Portfolio ROI Snapshot",
    value: "18.6%",
    note: "Design placeholder until live data wiring",
    icon: BarChart3,
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Financial analytics and system performance views will land here next.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="rounded-2xl border-white/40 bg-white/70 shadow-md shadow-yellow-100/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-amber-500" />
                  {metric.title}
                </CardTitle>
                <CardDescription>{metric.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Badge variant="secondary" className="w-fit">Design-first placeholder</Badge>
    </div>
  );
}
