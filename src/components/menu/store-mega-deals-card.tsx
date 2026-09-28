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
      className="group block overflow-hidden rounded-3xl border border-rose-500/20 bg-card/85 shadow-sm backdrop-blur-sm transition hover:border-rose-500/40 hover:shadow-md"
    >
      <div className="relative h-24 overflow-hidden bg-muted">
        <MenuSafeImage
          src={store.storeCoverImage}
          alt=""
          className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          fallback={
            <span className="absolute inset-0 bg-linear-to-br from-rose-500/35 via-orange-400/25 to-amber-300/20" />
          }
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/15 to-transparent" />

        <span className="absolute end-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-rose-600 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg shadow-rose-600/30">
          <Flame className="size-3 animate-pulse fill-current" />
          {t("menu.burnBadge")}
        </span>
      </div>

      <div className="relative -mt-7 px-3.5 pb-3.5">
        <div className="flex items-end gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-background shadow-md">
            {store.storeLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.storeLogoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Store className="size-5 text-primary" />
            )}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h3 className="truncate font-heading text-base font-semibold text-foreground">
              {store.storeName}
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              {t("menu.burnDealsCount", { count: store.dealsCount })}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {store.products.map((product) => (
            <div
              key={product.id}
              className="w-[7.25rem] shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-background/80"
            >
              <div className="relative aspect-square bg-muted">
                <MenuSafeImage
                  src={product.imageUrl}
                  alt=""
                  className="size-full object-cover"
                  fallback={
                    <span className="flex size-full items-center justify-center bg-linear-to-br from-rose-500/20 to-orange-400/15 text-rose-500">
                      <Flame className="size-5 opacity-70" />
                    </span>
                  }
                />
                <span className="absolute end-1 top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {t("menu.burnDiscountBadge", { value: String(product.discountPercent) })}
                </span>
              </div>
              <div className="space-y-0.5 p-2">
                <p className="line-clamp-2 min-h-[2.1rem] text-[11px] font-semibold leading-snug text-foreground">
                  {product.name}
                </p>
                <p className="text-[10px] text-muted-foreground line-through">
                  {formatMoney(product.price)}
                </p>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
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
