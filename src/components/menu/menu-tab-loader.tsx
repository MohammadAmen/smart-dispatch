"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { BeevLoader } from "@/components/brand/beev-loader";
import { useLocale } from "@/components/providers/locale-provider";
import { MENU_NAV_START_EVENT } from "@/lib/menu/chrome-events";

const MIN_VISIBLE_MS = 360;
const MAX_VISIBLE_MS = 4200;

/** Soft route transition loader for menu tab switches. */
export function MenuTabLoader(): ReactNode {
  const { t } = useLocale();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pending = useRef(false);
  const shownAt = useRef(0);
  const maxTimer = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (): void => {
      pending.current = true;
      shownAt.current = Date.now();
      setVisible(true);
      if (maxTimer.current != null) {
        window.clearTimeout(maxTimer.current);
      }
      maxTimer.current = window.setTimeout(() => {
        pending.current = false;
        setVisible(false);
        maxTimer.current = null;
      }, MAX_VISIBLE_MS);
    };
    window.addEventListener(MENU_NAV_START_EVENT, onStart);
    return () => {
      window.removeEventListener(MENU_NAV_START_EVENT, onStart);
      if (maxTimer.current != null) {
        window.clearTimeout(maxTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pending.current) {
      return;
    }
    const elapsed = Date.now() - shownAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = window.setTimeout(() => {
      pending.current = false;
      setVisible(false);
      if (maxTimer.current != null) {
        window.clearTimeout(maxTimer.current);
        maxTimer.current = null;
      }
    }, wait);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) {
    return null;
  }

  return <BeevLoader variant="overlay" label={t("common.loading")} />;
}
