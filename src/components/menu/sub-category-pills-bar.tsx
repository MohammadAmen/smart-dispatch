"use client";

import { m } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { type ReactNode } from "react";
import useSWR from "swr";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { useLocale } from "@/components/providers/locale-provider";
import { fetchSubCategories, subCategoriesKey } from "@/lib/stores/global-categories-query";
import type { PublicSubCategory } from "@/lib/stores/global-categories-types";
import { cn } from "@/lib/utils";

function ChipSkeleton(): ReactNode {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-slate-100 bg-white px-2.5 shadow-sm"
        >
          <div className="size-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3 w-12 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function SubCategoryChip({
  label,
  imageUrl,
  icon,
  active,
  onSelect,
}: {
  label: string;
  imageUrl?: string | null;
  icon?: string | null;
  active: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-2.5 shadow-sm transition",
        active
          ? "border-amber-500 bg-amber-50/60"
          : "border-slate-100 bg-white hover:border-amber-200",
      )}
      aria-pressed={active}
    >
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
        {imageUrl ? (
          <MenuSafeImage
            src={imageUrl}
            alt=""
            className="h-8 w-8 object-contain"
            fallback={
              icon ? (
                <span className="text-sm leading-none">{icon}</span>
              ) : (
                <LayoutGrid className="size-4 text-slate-400" />
              )
            }
          />
        ) : icon ? (
          <span className="text-sm leading-none">{icon}</span>
        ) : (
          <LayoutGrid className="size-4 text-slate-400" />
        )}
      </span>
      <span className="max-w-[7.5rem] truncate text-xs font-semibold text-slate-800">
        {label}
      </span>
    </m.button>
  );
}

export function SubCategoryPillsBar({
  mainCategoryId,
  lat,
  lng,
  selectedId,
  onSelect,
}: {
  mainCategoryId: string;
  lat: number | null;
  lng: number | null;
  selectedId: string | null;
  onSelect: (item: PublicSubCategory | null) => void;
}): ReactNode {
  const { t } = useLocale();
  const enabled = Boolean(mainCategoryId && mainCategoryId !== "all" && mainCategoryId !== "ALL");
  const key = enabled ? subCategoriesKey(mainCategoryId, lat, lng) : null;

  const { data, isLoading } = useSWR(
    key,
    () => fetchSubCategories(mainCategoryId, lat, lng),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 25_000,
      keepPreviousData: true,
    },
  );

  if (!enabled) {
    return null;
  }

  const items = data?.items ?? [];
  const loading = isLoading && !data;

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className="pb-1 pt-0.5">
      {loading ? (
        <ChipSkeleton />
      ) : (
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SubCategoryChip
            label={t("menu.allTypes")}
            active={!selectedId}
            onSelect={() => onSelect(null)}
          />
          {items.map((item) => (
            <SubCategoryChip
              key={item.id}
              label={item.name}
              imageUrl={item.imageUrl}
              icon={item.icon}
              active={selectedId === item.id}
              onSelect={() => onSelect(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
