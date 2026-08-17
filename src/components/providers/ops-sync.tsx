"use client";

import { useEffect } from "react";

import { useOpsStore } from "@/stores/ops-store";

function resolveConnectionStatus(): "online" | "offline" | "degraded" {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return "offline";
  }

  const connection = (
    navigator as Navigator & {
      connection?: { downlink?: number; effectiveType?: string };
    }
  ).connection;

  if (
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g" ||
    (typeof connection?.downlink === "number" && connection.downlink < 0.8)
  ) {
    return "degraded";
  }

  return "online";
}

export function OpsSync(): null {
  const setConnectionStatus = useOpsStore((state) => state.setConnectionStatus);
  const setActiveOrders = useOpsStore((state) => state.setActiveOrders);

  useEffect(() => {
    const syncStatus = (): void => {
      setConnectionStatus(resolveConnectionStatus());
    };

    syncStatus();
    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);

    const connection = (
      navigator as Navigator & { connection?: EventTarget }
    ).connection;

    connection?.addEventListener("change", syncStatus);

    const tick = window.setInterval(() => {
      setActiveOrders(22 + Math.floor(Math.random() * 6));
    }, 9000);

    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
      connection?.removeEventListener("change", syncStatus);
      window.clearInterval(tick);
    };
  }, [setActiveOrders, setConnectionStatus]);

  return null;
}
