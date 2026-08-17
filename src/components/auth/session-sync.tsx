"use client";

import { useEffect, type ReactNode } from "react";

import { fetchSession } from "@/lib/auth/client";
import { useSessionStore } from "@/stores/session-store";

export function SessionSync(): ReactNode {
  const setUser = useSessionStore((state) => state.setUser);
  const setLoaded = useSessionStore((state) => state.setLoaded);

  useEffect(() => {
    let cancelled = false;

    void fetchSession().then((user) => {
      if (cancelled) {
        return;
      }

      setUser(user);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [setLoaded, setUser]);

  return null;
}
