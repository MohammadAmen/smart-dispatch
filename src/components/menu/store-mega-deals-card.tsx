"use client";

import { Flame, Store } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { useLocale } from "@/components/providers/locale-provider";
import type { BurnDealStore } from "@/lib/stores/burn-deals-types";
import { formatMoney } from "@/lib/stores/pricing";

export function StoreMegaDealsCard({ store }: { store: BurnDealStore }): ReactNode {
  const { t } = useLocale();

  return (
    <Link
      href={`/menu/stores/${store.storeId}`}
      className="group relative block rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-card"
    >
      <span className="absolute end-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-red-500 to-amber-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm shadow-red-500/25">
        <Flame className="size-3 animate-pulse fill-current" />
        {t("menu.burnBadge")}
      </span>

      <div className="flex items-center gap-3 pe-24">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 object-cover dark:border-slate-700 dark:bg-slate-800">
          {store.storeLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.storeLogoUrl} alt="" className="size-full object-cover" />
          ) : (
            <Store className="size-5 text-slate-400" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-slate-900 dark:text-slate-50">
            {store.storeName}
          </h3>
          {store.storeTypeName ? (
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {store.storeTypeName}
            </p>
          ) : null}
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            {t("menu.burnDealsCount", { count: store.dealsCount })}
          </p>
        </div>
      </div>

      <div className="mt-3.5 rounded-2xl bg-slate-50/80 p-2.5 dark:bg-slate-900/50">
        <div className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {store.products.map((product) => (
            <div
              key={product.id}
              className="w-[7.5rem] shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-700">
                <MenuSafeImage
                  src={product.imageUrl}
                  alt=""
                  className="size-full object-cover"
                  fallback={
                    <span className="flex size-full items-center justify-center bg-linear-to-br from-red-500/15 to-amber-400/15 text-red-500">
                      <Flame className="size-5 opacity-70" />
                    </span>
                  }
                />
                <span className="absolute end-1.5 top-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {t("menu.burnDiscountBadge", { value: String(product.discountPercent) })}
                </span>
              </div>
              <div className="space-y-0.5 p-2">
                <p className="line-clamp-2 min-h-[2.1rem] text-[11px] font-semibold leading-snug text-slate-800 dark:text-slate-100">
                  {product.name}
                </p>
                <p className="text-[10px] text-slate-400 line-through">
                  {formatMoney(product.price)}
                </p>
                <p className="text-xs font-bold text-red-600">
                  {formatMoney(product.discountPrice)}{" "}
                  <span className="text-[9px] font-semibold">{t("menu.currency")}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
