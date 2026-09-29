"use client";

import { LayoutGrid } from "lucide-react";
import { type ReactNode } from "react";
import useSWR from "swr";

import { CategoryGridCard } from "@/components/menu/category-grid-card";
import { useLocale } from "@/components/providers/locale-provider";
import { fetchSubCategories, subCategoriesKey } from "@/lib/stores/global-categories-query";
import type { PublicSubCategory } from "@/lib/stores/global-categories-types";

function GridSkeleton(): ReactNode {
  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="h-[6.75rem] w-[5.65rem] shrink-0 animate-pulse rounded-3xl border border-slate-100 bg-slate-100 shadow-sm sm:h-28 sm:w-36"
        />
      ))}
    </div>
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
      dedupingInterval: 30_000,
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
    <section className="pb-1.5 pt-1">
      {loading ? (
        <GridSkeleton />
      ) : (
        <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryGridCard
            label={t("menu.allTypes")}
            active={!selectedId}
            variant="beev-all"
            onSelect={() => onSelect(null)}
          />
          {items.map((item) => (
            <CategoryGridCard
              key={item.id}
              label={item.name}
              imageUrl={item.imageUrl}
              icon={
                item.icon ? (
                  <span className="text-3xl">{item.icon}</span>
                ) : (
                  <LayoutGrid className="size-8 text-white/80" />
                )
              }
              active={selectedId === item.id}
              onSelect={() => onSelect(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
