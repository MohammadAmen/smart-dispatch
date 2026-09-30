"use client";

import {
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import { type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { BRAND_CHEF_LOCKUP_SRC, BRAND_NAME } from "@/lib/brand";
import { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";
import { cn } from "@/lib/utils";

export function MenuCinematicHeader({
  backgroundUrl,
  headerLabel,
  hydrated,
  locating,
  search,
  onLocate,
  onSearchChange,
}: {
  backgroundUrl: string | null;
  headerLabel: string;
  hydrated: boolean;
  locating: boolean;
  search: string;
  onLocate: () => void;
  onSearchChange: (value: string) => void;
}): ReactNode {
  const { t } = useLocale();
  const bg = backgroundUrl?.trim() || DEFAULT_MENU_HEADER_BACKGROUND;

  return (
    <section className="relative z-30">
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

        <div className="relative px-4 pb-20 pt-3">
          <div className="flex items-start justify-between gap-3">
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

        <svg
          className="pointer-events-none absolute inset-x-0 -bottom-px h-14 w-full text-background"
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

      {/* Lower pull-up so the wave stays visible above the full-width search */}
      <div className="relative z-10 -mt-2 px-4 pb-1 pt-1">
        <label className="relative block w-full">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("menu.searchHeroPlaceholder")}
            className={cn(
              "h-12 w-full rounded-2xl border border-slate-200/80 bg-white ps-10 pe-3",
              "text-sm font-medium text-slate-800 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.35)]",
              "outline-none placeholder:text-slate-400",
              "focus-visible:border-amber-400 focus-visible:ring-3 focus-visible:ring-amber-400/25",
              "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            )}
          />
        </label>
      </div>
    </section>
  );
}
