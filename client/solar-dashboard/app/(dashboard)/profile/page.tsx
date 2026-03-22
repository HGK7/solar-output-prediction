"use client";

import { Bell, Gauge, MonitorCog, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGuestPreferences } from "@/lib/use-guest-preferences";

export default function ProfilePage() {
  const { preferences, update } = useGuestPreferences();

  return (
    <div className="space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your display and notification preferences.
        </p>
      </header>

      <Card className="rounded-2xl border-white/40 bg-white/70 shadow-md shadow-yellow-100/40 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-sky-500" />
            Preferences
          </CardTitle>
          <CardDescription>
            Update default settings for your planning experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Gauge className="h-4 w-4 text-amber-500" />
              Units
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={preferences.units === "metric" ? "secondary" : "outline"}
                onClick={() => update({ units: "metric" })}
              >
                Metric
              </Button>
              <Button
                variant={preferences.units === "imperial" ? "secondary" : "outline"}
                onClick={() => update({ units: "imperial" })}
              >
                Imperial
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MonitorCog className="h-4 w-4 text-amber-500" />
              Theme Preference
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={preferences.theme === "light" ? "secondary" : "outline"}
                onClick={() => update({ theme: "light" })}
              >
                Light
              </Button>
              <Button
                variant={preferences.theme === "system" ? "secondary" : "outline"}
                onClick={() => update({ theme: "system" })}
              >
                System
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bell className="h-4 w-4 text-amber-500" />
              Notifications
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/40 bg-white/60 p-4">
              <div>
                <p className="text-sm font-medium">Analysis alerts</p>
                <p className="text-sm text-muted-foreground">
                  Receive reminders related to analysis updates and reports.
                </p>
              </div>
              <Button
                variant={preferences.notifications ? "secondary" : "outline"}
                onClick={() => update({ notifications: !preferences.notifications })}
              >
                {preferences.notifications ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </section>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Units: {preferences.units}</Badge>
            <Badge variant="secondary">Theme: {preferences.theme}</Badge>
            <Badge variant="secondary">
              Notifications: {preferences.notifications ? "on" : "off"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
