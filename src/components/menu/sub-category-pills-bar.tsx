"use client";

import { m } from "framer-motion";
import { type ReactNode } from "react";
import useSWR from "swr";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { useLocale } from "@/components/providers/locale-provider";
import { fetchSubCategories, subCategoriesKey } from "@/lib/stores/global-categories-query";
import type { PublicSubCategory } from "@/lib/stores/global-categories-types";
import { cn } from "@/lib/utils";

function PillSkeleton(): ReactNode {
  return (
    <div className="flex gap-2.5 overflow-hidden px-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-[4.6rem] w-[4.4rem] shrink-0 animate-pulse rounded-2xl bg-muted/80" />
      ))}
    </div>
  );
}

function SubCategoryPill({
  item,
  active,
  onSelect,
}: {
  item: PublicSubCategory;
  active: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onSelect}
      className={cn(
        "flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2 text-center transition",
        active
          ? "border-primary bg-primary/12 shadow-sm shadow-primary/20 ring-2 ring-primary/30"
          : "border-border/70 bg-card/70 hover:border-primary/30",
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center overflow-hidden rounded-2xl border bg-background text-lg shadow-sm transition",
          active ? "border-primary/40 scale-105" : "border-border/60",
        )}
      >
        {item.imageUrl ? (
          <MenuSafeImage
            src={item.imageUrl}
            alt=""
            className="size-full object-cover"
            fallback={<span className="leading-none">{item.icon}</span>}
          />
        ) : (
          <span className="leading-none">{item.icon}</span>
        )}
      </span>
      <span
        className={cn(
          "line-clamp-2 min-h-[1.9rem] text-[10px] font-semibold leading-tight",
          active ? "text-primary" : "text-foreground/85",
        )}
      >
        {item.name}
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
    <section className="space-y-2 pb-1 pt-1">
      <div className="flex items-center justify-between gap-2 px-4">
        <h2 className="text-sm font-semibold tracking-tight">{t("menu.subCategories")}</h2>
        {selectedId ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs font-semibold text-primary"
          >
            {t("menu.clearSubCategory")}
          </button>
        ) : null}
      </div>

      {loading ? (
        <PillSkeleton />
      ) : (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <SubCategoryPill
              key={item.id}
              item={item}
              active={selectedId === item.id}
              onSelect={() => onSelect(selectedId === item.id ? null : item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
