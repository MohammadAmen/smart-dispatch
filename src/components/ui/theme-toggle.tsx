"use client";

import { AnimatePresence, m } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import {
  applyTheme,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_EVENT = "sd-theme-change";
const cycle: ThemePreference[] = ["light", "dark", "system"];

const icon = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

function readPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): ThemePreference {
  return readPreference();
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

export function ThemeToggle({ className }: { className?: string }): ReactNode {
  const { t } = useLocale();
  const preference = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => {
      applyTheme("system");
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const onToggle = useCallback(() => {
    const next = cycle[(cycle.indexOf(preference) + 1) % cycle.length];
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, [preference]);

  const Icon = icon[preference];
  const resolved = resolveTheme(preference);

  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={onToggle}
      aria-label={t("aria.theme", { value: preference })}
      className={cn("relative overflow-hidden", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={`${preference}-${resolved}`}
          initial={{ opacity: 0, rotate: -40, y: 8 }}
          animate={{ opacity: 1, rotate: 0, y: 0 }}
          exit={{ opacity: 0, rotate: 40, y: -8 }}
          transition={{ duration: 0.22 }}
          className="flex"
        >
          <Icon className="size-4" />
        </m.span>
      </AnimatePresence>
    </Button>
  );
}
