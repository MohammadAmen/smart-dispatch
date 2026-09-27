"use client";

import { useEffect, useState, type ReactNode } from "react";

import { SplashScreen } from "@/components/brand/splash-screen";
import { BRAND_SPLASH_STORAGE_KEY } from "@/lib/brand";

/**
 * Shows the cinematic BEEV splash once per browser tab session
 * on first open of the site. Mount only from the root layout.
 */
export function SplashGate({ children }: { children: ReactNode }): ReactNode {
  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const seen = window.sessionStorage.getItem(BRAND_SPLASH_STORAGE_KEY) === "1";
      setShowSplash(!seen);
    } catch {
      setShowSplash(true);
    }
    setReady(true);
  }, []);

  return (
    <>
      {children}
      {ready && showSplash ? <SplashScreen onDone={() => setShowSplash(false)} /> : null}
    </>
  );
}
