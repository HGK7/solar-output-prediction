import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-400 gap-0 overflow-hidden">
        <DashboardSidebar />
        <ScrollArea className="app-shell-scroll min-w-0 flex-1">
          <main className="min-h-full px-4 pb-10 md:px-8">{children}</main>
        </ScrollArea>
      </div>
    </div>
  );
}
