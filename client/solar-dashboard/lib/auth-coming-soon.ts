"use client";

import { toast } from "sonner";

/** Non-blocking Coming soon for auth chrome. */
export function notifyAuthComingSoon() {
  toast.message("Coming soon", {
    description: "Sign-in is not available yet. Continue as a guest.",
    duration: 3500,
  });
}
