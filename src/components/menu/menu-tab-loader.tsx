"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { MENU_NAV_START_EVENT } from "@/lib/menu/chrome-events";

const HIDE_AFTER_MS = 420;

/**
 * Slim top progress for tab switches — never a full-screen takeover.
 * Hidden quickly once the route settles; skipped when navigation is instant.
 */
export function MenuTabLoader(): ReactNode {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pending = useRef(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (): void => {
      pending.current = true;
      setVisible(true);
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
    window.addEventListener(MENU_NAV_START_EVENT, onStart);
    return () => {
      window.removeEventListener(MENU_NAV_START_EVENT, onStart);
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pending.current) {
      return;
    }
    hideTimer.current = window.setTimeout(() => {
      pending.current = false;
      setVisible(false);
      hideTimer.current = null;
    }, HIDE_AFTER_MS);
    return () => {
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current);
      }
    };
  }, [pathname]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden"
      aria-hidden
    >
      <div className="menu-tab-progress h-full w-1/3 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.85)]" />
      <style>{`
        @keyframes menu-tab-progress-slide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        .menu-tab-progress {
          animation: menu-tab-progress-slide 0.9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
