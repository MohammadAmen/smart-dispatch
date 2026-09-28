"use client";

import { Bike, Clock, Star, Store } from "lucide-react";
import Link from "next/link";
import { memo, type ReactNode } from "react";

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
  const hasDistance = Number.isFinite(distanceKm);
  const fee = hasDistance ? feeFromDistanceKm(distanceKm, deliveryTiers) : null;
  const eta = estimateDeliveryMinutes(hasDistance ? distanceKm : Number.NaN);
  const ratingLabel = store.rating > 0 ? store.rating.toFixed(1) : null;
  const typeLabel = [store.storeType.name, store.city].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/menu/stores/${store.id}`}
      className="group block overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="relative h-36 overflow-hidden bg-slate-100 dark:bg-slate-900 sm:h-40">
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

        {ratingLabel ? (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-amber-300 backdrop-blur-sm">
            <Star className="size-3 fill-current" />
            {ratingLabel}
          </span>
        ) : null}
      </div>

      <div className="relative px-4 pb-4 pt-0">
        <div className="absolute -top-8 start-4">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt=""
              className="size-[4.25rem] rounded-full border-[3px] border-white object-cover shadow-md dark:border-slate-950"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="flex size-[4.25rem] items-center justify-center rounded-full border-[3px] border-white bg-amber-50 text-amber-600 shadow-md dark:border-slate-950 dark:bg-slate-900">
              <Icon className="size-7" />
            </span>
          )}
        </div>

        <div className="ps-[5.25rem] pt-2">
          <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
            {store.name}
          </h2>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {typeLabel || store.storeType.name}
          </p>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 px-3 py-2.5",
            "dark:border-slate-800 dark:bg-slate-900/80",
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Clock className="size-3.5 shrink-0 text-amber-500" />
            <span className="truncate">
              {t("menu.deliveryEta", { min: eta.min, max: eta.max })}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Bike className="size-3.5" />
            {fee != null
              ? `${formatMoney(fee)} ${t("menu.currency")}`
              : t("menu.deliveryFeeUnknown")}
          </span>
        </div>
      </div>
    </Link>
  );
}

export const NearbyStoreCard = memo(NearbyStoreCardComponent);
