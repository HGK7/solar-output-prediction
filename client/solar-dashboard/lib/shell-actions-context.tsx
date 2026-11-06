"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type ShellActions = {
  openSaveAnalysis?: () => void;
  canSaveAnalysis?: boolean;
  exportPortfolioCsv?: () => void;
  dashboardView?: "setup" | "pipeline" | "results";
  setDashboardView?: (view: "setup" | "pipeline" | "results") => void;
};

type ShellActionsContextValue = {
  register: (actions: Partial<ShellActions>) => void;
  actions: () => ShellActions;
  breadcrumb: string[];
  setBreadcrumb: (parts: string[]) => void;
};

const ShellActionsContext = createContext<ShellActionsContextValue | null>(null);

export function ShellActionsProvider({
  children,
  breadcrumb,
  setBreadcrumb,
}: {
  children: ReactNode;
  breadcrumb: string[];
  setBreadcrumb: (parts: string[]) => void;
}) {
  const actionsRef = useRef<ShellActions>({});

  const register = useCallback((actions: Partial<ShellActions>) => {
    actionsRef.current = { ...actionsRef.current, ...actions };
  }, []);

  const actions = useCallback(() => actionsRef.current, []);

  const value = useMemo(
    () => ({ register, actions, breadcrumb, setBreadcrumb }),
    [register, actions, breadcrumb, setBreadcrumb],
  );

  return (
    <ShellActionsContext.Provider value={value}>
      {children}
    </ShellActionsContext.Provider>
  );
}

export function useShellActions() {
  const context = useContext(ShellActionsContext);
  if (!context) {
    throw new Error("useShellActions must be used within ShellActionsProvider");
  }
  return context;
}
