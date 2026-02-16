"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { healthCheck } from "@/lib/api";

export type BackendStatus = "checking" | "connected" | "sleeping" | "unreachable";

const POLL_INTERVAL_MS = 30_000; // 30 s between automatic checks
const HEALTH_TIMEOUT_MS = 8_000; // 8 s timeout per request

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      await healthCheck(HEALTH_TIMEOUT_MS);
      setStatus("connected");
    } catch (err: unknown) {
      // AbortError → timed out → backend is likely sleeping (cold start)
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("sleeping");
      } else {
        setStatus("unreachable");
      }
    } finally {
      setLastChecked(new Date());
    }
  }, []);

  // Initial check + polling
  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  return { status, lastChecked, retry: check };
}
