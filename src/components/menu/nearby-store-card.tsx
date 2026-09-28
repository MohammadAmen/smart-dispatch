"use client";

import { Bike, Clock, Heart, Star, Store } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, type MouseEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import {
  estimateDeliveryMinutes,
  feeFromDistanceKm,
  type DeliveryTier,
} from "@/lib/platform/delivery-tiers";
import { formatMoney } from "@/lib/stores/pricing";
import { storeTypeIcon } from "@/lib/stores/store-type-icon";
import type { DirectoryStore } from "@/lib/stores/types";
import { cn } from "@/lib/utils";
import { useSavedStoresStore } from "@/stores/saved-stores-store";

function NearbyStoreCardComponent({
  store,
  distanceKm,
  deliveryTiers,
}: {
  store: DirectoryStore;
  distanceKm: number;
  deliveryTiers: DeliveryTier[];
}): ReactNode {
  const { t } = useLocale();
  const Icon = storeTypeIcon(store.storeType.icon);
  const hydrate = useSavedStoresStore((state) => state.hydrate);
  const isSaved = useSavedStoresStore((state) => state.isSaved(store.id));
  const toggleSaved = useSavedStoresStore((state) => state.toggle);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const hasDistance = Number.isFinite(distanceKm);
  const fee = hasDistance ? feeFromDistanceKm(distanceKm, deliveryTiers) : null;
  const eta = estimateDeliveryMinutes(hasDistance ? distanceKm : Number.NaN);
  const ratingLabel = store.rating > 0 ? store.rating.toFixed(1) : null;
  const typeLabel = [store.storeType.name, store.city].filter(Boolean).join(" - ");

  const onFavorite = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    toggleSaved({
      id: store.id,
      name: store.name,
      logoUrl: store.logoUrl,
      coverImage: store.coverImage,
      address: store.address,
      city: store.city,
      phone: store.phone,
    });
  };

  return (
    <Link
      href={`/menu/stores/${store.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm",
        "transition hover:-translate-y-0.5 hover:shadow-md",
        "dark:border-slate-800 dark:bg-slate-950",
      )}
    >
      {/* Cover */}
      <div className="relative h-40 overflow-hidden bg-slate-100 sm:h-44 dark:bg-slate-900">
        {store.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.coverImage}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-linear-to-br from-amber-100 via-orange-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
            <Store className="size-10 text-amber-500/70" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/35 to-transparent" />

        {/* Favorite — top-left */}
        <button
          type="button"
          onClick={onFavorite}
          aria-label={isSaved ? t("menu.unsaveStore") : t("menu.saveStore")}
          className={cn(
            "absolute top-3 left-3 z-10 inline-flex size-9 items-center justify-center rounded-full",
            "border border-white/25 bg-black/45 text-white shadow-sm backdrop-blur-md",
            "transition hover:bg-black/60",
          )}
        >
          <Heart className={cn("size-4", isSaved && "fill-rose-500 text-rose-500")} />
        </button>

        {/* Rating — top-right */}
        {ratingLabel ? (
          <span
            className={cn(
              "absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full",
              "border border-white/20 bg-black/55 px-2.5 py-1 text-xs font-bold backdrop-blur-md",
            )}
          >
            <Star className="size-3 fill-amber-300 text-amber-300" />
            <span className="text-white">{ratingLabel}</span>
          </span>
        ) : null}
      </div>

      {/* Body with floating avatar straddling the seam */}
      <div className="relative px-4 pb-3.5 pt-0">
        <div className="absolute -top-9 start-4 z-10">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt=""
              className="size-[4.5rem] rounded-full border-4 border-white object-cover shadow-md dark:border-slate-950"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="flex size-[4.5rem] items-center justify-center rounded-full border-4 border-white bg-amber-50 text-amber-600 shadow-md dark:border-slate-950 dark:bg-slate-900">
              <Icon className="size-7" />
            </span>
          )}
        </div>

        <div className="min-h-[3.25rem] ps-[5.5rem] pt-2.5">
          <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
            {store.name}
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {typeLabel || store.storeType.name}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Clock className="size-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {t("menu.deliveryEta", { min: eta.min, max: eta.max })}
            </span>
          </span>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Bike className="size-3.5" />
            <span className="flex flex-col items-end leading-tight">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {t("menu.deliveryFee")}
              </span>
              <span>
                {fee != null
                  ? `${formatMoney(fee)} ${t("menu.currency")}`
                  : t("menu.deliveryFeeUnknown")}
              </span>
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export const NearbyStoreCard = memo(NearbyStoreCardComponent);
/** Alias matching the requested StoreCard naming. */
export const StoreCard = NearbyStoreCard;
