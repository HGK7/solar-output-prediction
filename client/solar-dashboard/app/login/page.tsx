"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, Sun, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleContinue = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="h-full overflow-hidden">
      <ScrollArea className="app-shell-scroll h-full">
        <div className="mx-auto flex min-h-full max-w-md items-center justify-center px-6 py-12 md:px-12">
          <Card className="w-full rounded-2xl border-white/40 bg-white/70 shadow-md shadow-yellow-100/40 backdrop-blur-md">
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100/70">
                <Sun className="h-6 w-6 text-amber-500" />
              </div>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Continue to your solar planning workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContinue} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full bg-amber-400 text-foreground hover:bg-amber-500">
                  <LogIn className="h-4 w-4" />
                  Continue to Dashboard
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/signup">
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
