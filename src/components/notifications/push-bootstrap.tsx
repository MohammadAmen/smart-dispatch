"use client";

import { useEffect, type ReactElement } from "react";

export function PushBootstrap(): ReactElement | null {
  useEffect(() => {
    void import("@/lib/notifications/native-push").then((mod) => mod.startNativePush());
  }, []);

  return null;
}
