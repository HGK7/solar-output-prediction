import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardWorkspaceProvider } from "@/lib/dashboard-workspace-context";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { AnalyticsProvider } from "@/lib/analytics-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardWorkspaceProvider>
      <WorkspaceProvider>
        <AnalyticsProvider>
          <div className="h-full overflow-hidden">
            <SidebarProvider defaultOpen={true} className="h-full">
              <div className="mx-auto flex h-full w-full max-w-400 gap-0 overflow-hidden relative">
                <DashboardSidebar />
                <SidebarInset className="min-w-0 h-full">
                  <div className="border-b border-white/40 bg-white/70 px-6 py-3 backdrop-blur-md">
                  </div>
                  <ScrollArea className="app-shell-scroll h-full min-w-0 flex-1">
                    <main className="min-h-full px-6 pb-12 md:px-10 lg:px-12">{children}</main>
                  </ScrollArea>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </div>
        </AnalyticsProvider>
      </WorkspaceProvider>
    </DashboardWorkspaceProvider>
  );
}
