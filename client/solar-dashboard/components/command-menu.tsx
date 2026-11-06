"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChartNoAxesCombined,
  Download,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  PlusCircle,
  Save,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useZenithPreferences } from "@/context/zenith-preferences-context";
import { useLocationsStore } from "@/lib/locations-store";
import { useShellActions } from "@/lib/shell-actions-context";
import { downloadRunsCsv } from "@/lib/export-csv";

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { setAssistantOpen: setChatOpen } = useZenithPreferences();
  const { actions } = useShellActions();
  const { locations } = useLocationsStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setChatOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setChatOpen]);

  const run = useCallback(
    (fn: () => void) => {
      setOpen(false);
      fn();
    },
    [],
  );

  const shell = actions();
  const analyzedLocations = locations.filter((l) => l.latestRun);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search navigation, actions, sites..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => run(() => router.push("/dashboard"))}>
            <LayoutDashboard />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/locations"))}>
            <MapPin />
            Locations
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/analytics"))}>
            <ChartNoAxesCombined />
            Analytics
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/profile"))}>
            <Settings />
            Profile
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => router.push("/dashboard"))}>
            <PlusCircle />
            New analysis
          </CommandItem>
          <CommandItem
            disabled={!shell.canSaveAnalysis}
            onSelect={() => run(() => shell.openSaveAnalysis?.())}
          >
            <Save />
            Save analysis
          </CommandItem>
          <CommandItem
            disabled={analyzedLocations.length === 0}
            onSelect={() =>
              run(() => {
                downloadRunsCsv(analyzedLocations);
                toast.success("Portfolio CSV exported");
              })
            }
          >
            <Download />
            Export CSV
          </CommandItem>
          <CommandItem onSelect={() => run(() => setChatOpen(true))}>
            <MessageCircle />
            Open chat
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {locations.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sites">
              {locations.map((location) => (
                <CommandItem
                  key={location.id}
                  value={`${location.name} ${location.coordinates.lat} ${location.coordinates.lon}`}
                  onSelect={() =>
                    run(() => router.push(`/location/${location.id}`))
                  }
                >
                  <MapPin />
                  {location.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
