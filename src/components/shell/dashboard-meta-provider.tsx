"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardMeta = { title: string; subtitle?: string };

const DashboardMetaContext = createContext<{
  meta: DashboardMeta;
  setMeta: (patch: Partial<DashboardMeta>) => void;
} | null>(null);

const defaultMeta: DashboardMeta = { title: "FlowKanban" };

export function DashboardMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<DashboardMeta>(defaultMeta);
  const setMeta = useCallback((patch: Partial<DashboardMeta>) => {
    setMetaState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({ meta, setMeta }), [meta, setMeta]);

  return (
    <DashboardMetaContext.Provider value={value}>
      {children}
    </DashboardMetaContext.Provider>
  );
}

export function useDashboardMeta() {
  const ctx = useContext(DashboardMetaContext);
  if (!ctx) {
    throw new Error("useDashboardMeta must be used within DashboardMetaProvider");
  }
  return ctx;
}
