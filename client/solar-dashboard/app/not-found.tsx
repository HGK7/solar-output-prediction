import Link from "next/link";
import { ArrowLeft, Home, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10 md:px-12">
      <Card className="w-full max-w-xl rounded-2xl border-white/40 bg-white/75 shadow-md shadow-yellow-100/40 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/70">
            <TriangleAlert className="h-6 w-6 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            The page is unavailable or the URL is incorrect.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="bg-amber-400 text-foreground hover:bg-amber-500">
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
