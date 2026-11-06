import Link from "next/link";
import { ArrowLeft, MapPinOff } from "lucide-react";
import { BentoTile, ErrorState } from "@/components/bento";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center py-10">
      <BentoTile
        variant="elevated"
        title="Dashboard page not found"
        description="The requested dashboard route is unavailable or the record does not exist."
        icon={<MapPinOff className="size-4" aria-hidden />}
        headingLevel={2}
        className="w-full max-w-lg"
      >
        <ErrorState
          title="Route unavailable"
          message="Check the location ID or return to the active workspace to select a saved solar site."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                Return to Dashboard
              </Link>
            </Button>
          }
        />
      </BentoTile>
    </div>
  );
}
