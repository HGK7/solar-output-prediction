"use client";

import { createContext, useContext } from "react";
import { useBackendStatus, type BackendStatus } from "@/lib/use-backend-status";

type BackendStatusContextValue = {
  status: BackendStatus;
  lastChecked: Date | null;
  retry: () => Promise<void>;
  markConnected: () => void;
  markDisconnected: () => void;
};

const BackendStatusContext = createContext<BackendStatusContextValue | null>(null);

export function BackendStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useBackendStatus();
  return (
    <BackendStatusContext.Provider value={value}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatusContext(): BackendStatusContextValue {
  const ctx = useContext(BackendStatusContext);
  if (!ctx) {
    throw new Error(
      "useBackendStatusContext must be used within BackendStatusProvider",
    );
  }
  return ctx;
}
