"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  LayoutDashboard,
  MapPin,
  Menu,
  Settings,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useBackendStatusContext } from "@/lib/backend-status-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/profile", label: "Profile", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start rounded-xl",
              isActive ? "bg-amber-100/70 text-foreground" : "text-muted-foreground",
            )}
          >
            <Link href={item.href} onClick={onNavigate}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar() {
  const { status, lastChecked, retry } = useBackendStatusContext();

  const statusColor =
    status === "connected"
      ? "bg-emerald-500"
      : status === "checking"
        ? "bg-amber-500"
        : status === "sleeping"
          ? "bg-blue-500"
          : "bg-red-500";

  return (
    <>
      <aside className="hidden h-full md:flex md:w-64 md:shrink-0">
        <div className="flex h-full w-full flex-col border-r border-white/40 bg-white/70 backdrop-blur-md">
          <div className="p-4 pb-0">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Solar Dashboard</p>
              <p className="text-xs text-muted-foreground">Planning Workspace</p>
            </div>
            <Separator className="mb-4" />
          </div>
          <ScrollArea className="app-shell-scroll flex-1 px-4 pb-4">
            <NavLinks />

            <div className="mt-4 space-y-2">
              <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                <Link href="/signup">
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </Link>
              </Button>
            </div>
          </ScrollArea>
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-white/40 bg-white/80 p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                <span className="font-medium">Backend: {status}</span>
              </div>
              <p className="text-muted-foreground mt-1">
                Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : "--"}
              </p>
              {status !== "connected" && (
                <Button
                  size="xs"
                  className="mt-2 w-full"
                  onClick={() => {
                    retry();
                  }}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="md:hidden px-4 pt-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl">
              <Menu className="h-4 w-4" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>Solar Dashboard</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
