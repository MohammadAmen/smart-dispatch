"use client";

import {
  Clock3,
  LoaderCircle,
  MapPin,
  Moon,
  Navigation,
  Search,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { BRAND_CHEF_LOCKUP_SRC, BRAND_NAME } from "@/lib/brand";
import { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";
import { readTrackingTokens } from "@/lib/stores/menu-track-store";
import {
  applyTheme,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_EVENT = "sd-theme-change";
const themeCycle: ThemePreference[] = ["light", "dark", "system"];

function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

export function MenuCinematicHeader({
  backgroundUrl,
  headerLabel,
  hydrated,
  locating,
  search,
  savedCount,
  onLocate,
  onSearchChange,
  onSavedOpen,
}: {
  backgroundUrl: string | null;
  headerLabel: string;
  hydrated: boolean;
  locating: boolean;
  search: string;
  savedCount: number;
  onLocate: () => void;
  onSearchChange: (value: string) => void;
  onSavedOpen: () => void;
}): ReactNode {
  const { t } = useLocale();
  const bg = backgroundUrl?.trim() || DEFAULT_MENU_HEADER_BACKGROUND;
  const [ordersCount, setOrdersCount] = useState(0);
  const [themePref, setThemePref] = useState<ThemePreference>("system");

  useEffect(() => {
    setOrdersCount(readTrackingTokens().length);
    setThemePref(readThemePreference());
    const onTheme = (): void => setThemePref(readThemePreference());
    window.addEventListener(THEME_EVENT, onTheme);
    window.addEventListener("storage", onTheme);
    return () => {
      window.removeEventListener(THEME_EVENT, onTheme);
      window.removeEventListener("storage", onTheme);
    };
  }, []);

  const cycleTheme = (): void => {
    const next = themeCycle[(themeCycle.indexOf(themePref) + 1) % themeCycle.length];
    applyTheme(next);
    setThemePref(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <section className="relative z-30">
      {/* Cinematic hero */}
      <div className="relative overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bg}
          alt=""
          className="absolute inset-0 size-full scale-105 object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-black/80" />
        <div className="absolute inset-0 bg-linear-to-r from-black/50 via-transparent to-black/40" />

        <div className="relative px-4 pb-16 pt-3">
          <div className="mb-2 flex justify-end">
            <LocaleToggle
              compact
              className="size-8 rounded-full border border-white/20 bg-black/30 text-white/90 hover:bg-white/15 hover:text-white"
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            {/* Brand lockup (chef bee + BEEV) — start/right in RTL */}
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND_CHEF_LOCKUP_SRC}
                alt={BRAND_NAME}
                width={168}
                height={112}
                className="h-[5.25rem] w-auto max-w-[10.5rem] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)] sm:h-[6rem] sm:max-w-[12rem]"
                draggable={false}
              />
            </div>

            {/* Slogan + golden underline */}
            <div className="min-w-0 flex-1 pt-3 text-end">
              <p
                className={cn(
                  "text-balance text-[1.05rem] font-extrabold leading-snug text-white",
                  "drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] sm:text-xl",
                )}
              >
                {t("menu.heroSlogan")}
              </p>
              <svg
                className="ms-auto mt-2 h-3 w-[min(100%,11rem)] text-amber-400"
                viewBox="0 0 180 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 8 C40 2, 90 14, 178 4"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Compact location */}
          <button
            type="button"
            onClick={onLocate}
            className="mt-4 flex w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-start backdrop-blur-md"
          >
            {locating ? (
              <LoaderCircle className="size-3.5 shrink-0 animate-spin text-amber-300" />
            ) : (
              <MapPin className="size-3.5 shrink-0 text-amber-300" />
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/95">
              {!hydrated || locating ? t("menu.detectingLocation") : headerLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
              <Navigation className="size-2.5" />
              {t("menu.changeLocation")}
            </span>
          </button>
        </div>

        {/* Soft concave wave */}
        <svg
          className="pointer-events-none absolute inset-x-0 -bottom-px h-12 w-full text-background"
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,48 C180,96 360,8 540,40 C720,72 900,16 1080,48 C1260,80 1380,40 1440,56 L1440,96 L0,96 Z"
          />
        </svg>
      </div>

      {/* Search + quick actions docked on the wave */}
      <div className="relative z-10 -mt-7 space-y-2.5 px-4 pb-1">
        <div className="flex items-stretch gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("menu.searchHeroPlaceholder")}
              className={cn(
                "h-12 w-full rounded-2xl border border-slate-200/80 bg-white ps-10 pe-3",
                "text-sm font-medium text-slate-800 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.45)]",
                "outline-none placeholder:text-slate-400",
                "focus-visible:border-amber-400 focus-visible:ring-3 focus-visible:ring-amber-400/25",
                "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              )}
            />
          </label>

          <button
            type="button"
            onClick={onLocate}
            className={cn(
              "flex w-[6.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl",
              "border border-slate-200/80 bg-white px-2 py-1.5 text-center shadow-[0_12px_28px_-14px_rgba(0,0,0,0.45)]",
              "dark:border-slate-700 dark:bg-slate-900",
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Clock3 className="size-3.5" />
            </span>
            <span className="text-[10px] font-bold leading-tight text-slate-800 dark:text-slate-100">
              {t("menu.ordersFasterTitle")}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onSavedOpen}
            className="relative flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-900 px-2 py-2.5 text-white shadow-md dark:bg-slate-800"
          >
            <Store className="size-4 text-amber-300" />
            <span className="text-center text-[10px] font-bold leading-tight">
              {t("menu.savedRestaurants")}
            </span>
            {savedCount > 0 ? (
              <span className="absolute -top-1 -end-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {savedCount > 9 ? "9+" : savedCount}
              </span>
            ) : null}
          </button>

          <Link
            href="/menu/orders"
            className="relative flex flex-col items-center justify-center gap-1 rounded-2xl bg-amber-400 px-2 py-2.5 text-slate-900 shadow-md shadow-amber-500/30"
          >
            <Clock3 className="size-4" />
            <span className="text-center text-[10px] font-extrabold leading-tight">
              {t("menu.myOrders")}
            </span>
            {ordersCount > 0 ? (
              <span className="absolute -top-1 -end-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {ordersCount > 9 ? "9+" : ordersCount}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={cycleTheme}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-900 px-2 py-2.5 text-white shadow-md dark:bg-slate-800"
            aria-label={t("aria.theme", { value: themePref })}
          >
            <Moon className="size-4 text-amber-300" />
            <span className="text-center text-[10px] font-bold leading-tight">
              {t("menu.appearance")}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
