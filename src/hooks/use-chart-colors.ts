"use client";

import { useEffect, useState } from "react";

interface ChartColors {
  primary: string;
  success: string;
  info: string;
  warning: string;
  muted: string;
  foreground: string;
  grid: string;
}

const fallback: ChartColors = {
  primary: "#e9b71f",
  success: "#3da66a",
  info: "#a67c2a",
  warning: "#c98414",
  muted: "#7b8494",
  foreground: "#1e2430",
  grid: "rgba(120, 130, 145, 0.22)",
};

function readColor(name: string, backup: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value.length > 0 ? value : backup;
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(fallback);

  useEffect(() => {
    const sync = (): void => {
      setColors({
        primary: readColor("--primary", fallback.primary),
        success: readColor("--success", fallback.success),
        info: readColor("--info", fallback.info),
        warning: readColor("--warning", fallback.warning),
        muted: readColor("--muted-foreground", fallback.muted),
        foreground: readColor("--foreground", fallback.foreground),
        grid: "color-mix(in oklch, var(--border) 70%, transparent)",
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
