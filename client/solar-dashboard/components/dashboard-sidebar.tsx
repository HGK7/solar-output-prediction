"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Loader2,
  LayoutDashboard,
  MapPin,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBackendStatusContext } from "@/lib/backend-status-context";
import { useDashboardWorkspace } from "@/lib/dashboard-workspace-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "./ui/badge";

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

const STAGE_LABELS: Record<string, string> = {
  idle: "Ready",
  location: "Data check",
  prediction: "Energy estimate",
  physics: "Engineering check",
  financial: "Cost & savings",
  explanation: "Explanation",
  complete: "Complete",
  error: "Error",
};

const STAGE_SUMMARY: Record<string, string> = {
  idle: "Ready for a new run.",
  location: "Checking local climate averages.",
  prediction: "Estimating solar energy output.",
  physics: "Cross-checking with system physics.",
  financial: "Calculating costs and savings.",
  explanation: "Writing a plain-language summary.",
  complete: "Run complete. Review results.",
  error: "Run error. Try again when ready.",
};

const SERVER_STATUS_LABELS: Record<string, string> = {
  connected: "online",
  checking: "checking",
  sleeping: "starting",
  unreachable: "unverified",
};

function DashboardNavMenu({
  pathname,
  isAnalysisRunning,
  onNavigateAttempt,
}: {
  pathname: string;
  isAnalysisRunning: boolean;
  onNavigateAttempt: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <React.Fragment key={item.href}>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.label}
                className={`rounded-xl ${isAnalysisRunning ? "pointer-events-none opacity-50" : ""}`}
              >
                <Link href={item.href} onClick={(event) => onNavigateAttempt(event, item.href)}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {index < NAV_ITEMS.length - 1 && (
              <SidebarSeparator className="mx-2 border-white/20" />
            )}
          </React.Fragment>
        );
      })}
    </SidebarMenu>
  );
}

export function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, lastChecked, retry } = useBackendStatusContext();
  const { stage, unsavedAnalysis } = useDashboardWorkspace();
  const isAnalysisRunning = stage !== "idle" && stage !== "complete" && stage !== "error";
  const [showLeaveDialog, setShowLeaveDialog] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  const statusColor =
    status === "connected"
      ? "bg-emerald-500"
      : status === "checking"
        ? "bg-amber-500"
        : status === "sleeping"
          ? "bg-blue-500"
          : "bg-red-500";
  const serverStatusLabel = SERVER_STATUS_LABELS[status] ?? status;
  const shouldGuardNavigation = unsavedAnalysis && pathname.startsWith("/dashboard");

  const onNavigateAttempt = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isAnalysisRunning) {
      event.preventDefault();
      return;
    }
    if (!shouldGuardNavigation || href.startsWith(pathname)) {
      return;
    }

    event.preventDefault();
    setPendingHref(href);
    setShowLeaveDialog(true);
  };

  return (
    <Sidebar
      variant="floating"
      side="left"
      collapsible="offcanvas"
      className="border border-white/40 bg-white/85 backdrop-blur-xl shadow-lg shadow-sky-100/40"
    >
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-start justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold text-foreground">Zenith</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="app-shell-scroll">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <DashboardNavMenu
              pathname={pathname}
              isAnalysisRunning={isAnalysisRunning}
              onNavigateAttempt={onNavigateAttempt}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to Home" className="rounded-xl">
                  <Link
                    href="/"
                    onClick={(event) => onNavigateAttempt(event, "/")}
                    className={isAnalysisRunning ? "pointer-events-none opacity-50" : ""}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                {/* Reserved for future quick actions */}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="space-y-3 rounded-xl border border-white/50 bg-white/85 p-3 text-xs group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Badge
              variant="outline"
              className={`text-[11px] ${stage === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : stage === "complete"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : stage === "idle"
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
            >
              {STAGE_LABELS[stage] ?? "Ready"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{STAGE_SUMMARY[stage] ?? ""}</p>

          <div className="h-px bg-white/60" />

          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
            <span className="font-medium">Server status: {serverStatusLabel}</span>
          </div>
          <p className="text-muted-foreground">
            Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : "--"}
          </p>
          {isAnalysisRunning && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/80 px-2.5 py-2 text-amber-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analysis running. Navigation locked.</span>
            </div>
          )}
          {status !== "connected" && (
            <Button
              size="xs"
              className="mt-1 w-full"
              onClick={() => {
                retry();
              }}
            >
              Retry
            </Button>
          )}
        </div>
      </SidebarFooter>

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved analysis</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This analysis is not saved. If you leave now, you will lose the results.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              Stay
            </Button>
            <Button
              className="bg-amber-400 text-foreground hover:bg-amber-500"
              onClick={() => {
                if (pendingHref) {
                  router.push(pendingHref);
                }
                setPendingHref(null);
                setShowLeaveDialog(false);
              }}
            >
              Leave anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
