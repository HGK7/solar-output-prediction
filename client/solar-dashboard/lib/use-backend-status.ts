"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { healthCheck } from "@/lib/api";

export type BackendStatus = "checking" | "connected" | "sleeping" | "unreachable";

const RETRY_INTERVAL_MS = 15_000; // 15 s retry when not connected
const HEALTH_TIMEOUT_MS = 8_000;  // 8 s timeout per request

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      await healthCheck(HEALTH_TIMEOUT_MS);
      setStatus("connected");
      // Once connected, stop polling — no need to keep pinging
      stopPolling();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("sleeping");
      } else {
        setStatus("unreachable");
      }
    } finally {
      setLastChecked(new Date());
    }
  }, [stopPolling]);

  // Start polling only when not connected (initial + retry cycles)
  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(check, RETRY_INTERVAL_MS);
  }, [check, stopPolling]);

  // Called when an API call (e.g. /analyze) fails — re-checks backend
  const markDisconnected = useCallback(() => {
    setStatus("unreachable");
    setLastChecked(new Date());
    startPolling();
    // Also fire an immediate check
    check();
  }, [check, startPolling]);

  // Initial check + polling until connected
  useEffect(() => {
    check();
    startPolling();
    return stopPolling;
  }, [check, startPolling, stopPolling]);

  return { status, lastChecked, retry: check, markDisconnected };
}
