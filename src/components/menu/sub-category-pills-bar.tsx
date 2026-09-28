"use client";

import { m } from "framer-motion";
import Image from "next/image";
import { LayoutGrid } from "lucide-react";
import { type ReactNode } from "react";
import useSWR from "swr";

import { useLocale } from "@/components/providers/locale-provider";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { fetchSubCategories, subCategoriesKey } from "@/lib/stores/global-categories-query";
import type { PublicSubCategory } from "@/lib/stores/global-categories-types";
import { cn } from "@/lib/utils";

function GridSkeleton(): ReactNode {
  return (
    <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="h-24 w-36 shrink-0 animate-pulse rounded-2xl border border-slate-100 bg-slate-100 shadow-sm"
        />
      ))}
    </div>
  );
}

function SubCategoryGridCard({
  label,
  imageUrl,
  icon,
  active,
  onSelect,
  allChip = false,
}: {
  label: string;
  imageUrl?: string | null;
  icon?: string | null;
  active: boolean;
  onSelect: () => void;
  allChip?: boolean;
}): ReactNode {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative h-24 w-36 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-100 shadow-sm transition-all",
        active && "scale-[1.02] ring-2 ring-amber-500",
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="144px"
          className="object-cover"
          unoptimized
        />
      ) : allChip ? (
        <span className="absolute inset-0 bg-linear-to-br from-amber-300 via-amber-500 to-amber-800">
          <span className="absolute inset-x-0 top-1.5 bottom-8 flex items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_LOGO_SRC}
              alt=""
              width={72}
              height={72}
              className="h-[4.25rem] w-[4.25rem] object-contain drop-shadow-md"
              draggable={false}
            />
          </span>
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-slate-700 to-slate-900 text-3xl">
          {icon || <LayoutGrid className="size-8 text-white/80" />}
        </span>
      )}

      <span className="absolute inset-0 flex items-end justify-center bg-linear-to-t from-black/80 via-black/30 to-transparent p-2">
        <span className="text-center text-xs font-bold text-white drop-shadow-md sm:text-sm">
          {label}
        </span>
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
          <SubCategoryGridCard
            label={t("menu.allTypes")}
            active={!selectedId}
            allChip
            onSelect={() => onSelect(null)}
          />
          {items.map((item) => (
            <SubCategoryGridCard
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
