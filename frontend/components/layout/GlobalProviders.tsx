"use client";

import { useMarketWebSocket, useAlertsStream } from "@/lib/hooks/useWebSocket";
import { useEffect } from "react";
import { useAlertStore } from "@/lib/stores/alertStore";
import { api } from "@/lib/api";

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  // Open both streams once at the root.
  useMarketWebSocket();
  useAlertsStream();

  const setMany = useAlertStore((s) => s.setMany);
  useEffect(() => {
    api.recentAlerts(50).then(setMany).catch(() => {});
  }, [setMany]);

  return <>{children}</>;
}
