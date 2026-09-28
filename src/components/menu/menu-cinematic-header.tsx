"use client";

import {
  Bookmark,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { useLocale } from "@/components/providers/locale-provider";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";
import { cn } from "@/lib/utils";

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

  return (
    <section className="relative z-30">
      <div className="relative overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bg}
          alt=""
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/45 to-black/70" />
        <div className="absolute inset-0 bg-linear-to-tr from-amber-950/35 via-transparent to-black/20" />

        <div className="relative px-4 pb-14 pt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark
                size={56}
                className="h-14 w-14 rounded-2xl border-white/25 bg-white/10 shadow-lg shadow-black/30"
              />
              <div className="min-w-0">
                <p className="truncate font-heading text-xl font-extrabold tracking-tight text-white drop-shadow-md">
                  {t("brand.name")}
                </p>
                <p className="mt-0.5 max-w-[14rem] text-[13px] font-bold leading-snug text-amber-50 drop-shadow-md sm:max-w-xs sm:text-sm">
                  {t("menu.heroSlogan")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-black/25 p-1.5 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={onSavedOpen}
                className="relative inline-flex size-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
                aria-label={t("menu.savedStores")}
              >
                <Bookmark className={cn("size-4", savedCount > 0 && "fill-amber-300 text-amber-300")} />
                {savedCount > 0 ? (
                  <span className="absolute -top-0.5 -end-0.5 inline-flex min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-slate-900">
                    {savedCount > 9 ? "9+" : savedCount}
                  </span>
                ) : null}
              </button>
              <Link
                href="/menu/orders"
                className="inline-flex size-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
                aria-label={t("menu.trackTitle")}
              >
                <ClipboardList className="size-4" />
              </Link>
              <LocaleToggle
                compact
                className="size-8 rounded-full text-white/90 hover:bg-white/15 hover:text-white"
              />
              <ThemeToggle className="size-8 rounded-full text-white/90 hover:bg-white/15 hover:text-white" />
            </div>
          </div>

          <button
            type="button"
            onClick={onLocate}
            className="mt-4 flex w-full items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3.5 py-2 text-start shadow-md backdrop-blur-md"
          >
            {locating ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-amber-300" />
            ) : (
              <MapPin className="size-4 shrink-0 text-amber-300" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium tracking-wide text-white/70 uppercase">
                {t("menu.yourLocation")}
              </span>
              <span className="block truncate text-sm font-semibold text-white">
                {!hydrated || locating ? t("menu.detectingLocation") : headerLabel}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-bold text-slate-900">
              <Navigation className="size-3" />
              {t("menu.changeLocation")}
            </span>
          </button>
        </div>

        {/* Concave wave into cream page */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-background"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,40 C240,90 480,0 720,35 C960,70 1200,10 1440,45 L1440,80 L0,80 Z"
          />
        </svg>
      </div>

      {/* Search docked on the curve */}
      <div className="relative z-10 -mt-6 px-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-amber-600" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("menu.searchStores")}
            className="h-12 w-full rounded-2xl border border-amber-200/70 bg-white ps-10 pe-3 text-sm font-medium text-slate-800 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] outline-none placeholder:text-slate-400 focus-visible:border-amber-400 focus-visible:ring-3 focus-visible:ring-amber-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>
    </section>
  );
}
