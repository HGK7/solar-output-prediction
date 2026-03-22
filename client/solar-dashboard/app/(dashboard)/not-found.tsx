import Link from "next/link";
import { ArrowLeft, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center py-10">
      <Card className="w-full max-w-lg rounded-2xl border-white/40 bg-white/75 shadow-md shadow-yellow-100/40 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100/70">
            <MapPinOff className="h-6 w-6 text-sky-500" />
          </div>
          <CardTitle className="text-2xl">Dashboard page not found</CardTitle>
          <CardDescription>
            The requested dashboard route is unavailable or the record does not exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
