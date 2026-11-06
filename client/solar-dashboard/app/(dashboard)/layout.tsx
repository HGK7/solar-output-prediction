"use client";

import { useState } from "react";
import { DashboardErrorBoundary } from "@/components/dashboard-error-boundary";
import { DashboardWorkspaceProvider } from "@/lib/dashboard-workspace-context";
import { AnalyticsProvider } from "@/lib/analytics-context";
import { ShellActionsProvider } from "@/lib/shell-actions-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [breadcrumb, setBreadcrumb] = useState<string[]>(["Solar Planner"]);

  return (
    <DashboardWorkspaceProvider>
      <AnalyticsProvider>
        <ShellActionsProvider
          breadcrumb={breadcrumb}
          setBreadcrumb={setBreadcrumb}
        >
          <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
        </ShellActionsProvider>
      </AnalyticsProvider>
    </DashboardWorkspaceProvider>
  );
}
