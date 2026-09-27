"use client";

import { m } from "framer-motion";
import { Flame, Plus, Percent, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { useLocale } from "@/components/providers/locale-provider";
import { baseCartExtras } from "@/lib/stores/menu-cart";
import type { DiscoveryProduct } from "@/lib/stores/discovery-types";
import {
  discountPercentOff,
  effectiveProductPrice,
  formatMoney,
  isDiscountedProduct,
} from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/stores/menu-cart-store";

export function ShowcaseProductCard({
  product,
  orientation = "vertical",
}: {
  product: DiscoveryProduct;
  orientation?: "vertical" | "horizontal";
}): ReactNode {
  const { t } = useLocale();
  const add = useMenuCartStore((state) => state.add);
  const [added, setAdded] = useState(false);
  const discounted = isDiscountedProduct(product);
  const percent = discountPercentOff(product);
  const price = effectiveProductPrice(product);

  const onAdd = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    add({
      ...baseCartExtras(product.id),
      productId: product.id,
      storeId: product.storeId,
      storeName: product.storeName,
      storeLogoUrl: product.storeLogoUrl,
      storeLat: product.storeLat,
      storeLng: product.storeLng,
      name: product.name,
      price,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  const badge = (() => {
    if (discounted && percent != null) {
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Percent className="size-2.5" />
          {t("menu.discoveryDiscountBadge", { value: String(percent) })}
        </span>
      );
    }
    if (product.badge === "TRENDING") {
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Flame className="size-2.5" />
          {t("menu.discoveryTrendingBadge")}
        </span>
      );
    }
    if (product.badge === "NEW") {
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Sparkles className="size-2.5" />
          {t("menu.discoveryNewBadge")}
        </span>
      );
    }
    return null;
  })();

  const storeCapsule = (
    <span className="pointer-events-none absolute start-2 top-2 z-10 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full border border-white/25 bg-black/45 px-1.5 py-1 pe-2.5 text-white shadow-sm backdrop-blur-md">
      <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-1 ring-white/30">
        {product.storeLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.storeLogoUrl} alt="" className="size-full object-cover" />
        ) : (
          <Store className="size-2.5 opacity-90" />
        )}
      </span>
      <span className="truncate text-[10px] font-semibold leading-none">{product.storeName}</span>
    </span>
  );

  if (orientation === "horizontal") {
    return (
      <Link
        href={`/menu/stores/${product.storeId}`}
        className="group relative flex w-[17.5rem] shrink-0 gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm backdrop-blur-sm transition hover:border-primary/35"
      >
        <div className="relative h-[5.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-xl bg-muted">
          <MenuSafeImage
            src={product.imageUrl}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
            fallback={
              <span className="flex size-full items-center justify-center bg-linear-to-br from-primary/25 to-warning/20 text-primary">
                <Store className="size-5 opacity-60" />
              </span>
            }
          />
          {storeCapsule}
          {badge ? <span className="absolute end-1.5 bottom-1.5 z-10">{badge}</span> : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 pe-0.5">
          <div className="min-w-0 space-y-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{product.name}</p>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-sm font-bold text-primary">
                {formatMoney(price)} {t("menu.currency")}
              </span>
              {discounted ? (
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatMoney(product.price)}
                </span>
              ) : null}
            </div>
          </div>
          <m.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onAdd}
            className={cn(
              "ms-auto inline-flex size-8 items-center justify-center rounded-full text-primary-foreground shadow-sm transition",
              added ? "bg-emerald-500" : "bg-primary",
            )}
            aria-label={t("menu.discoveryAdd")}
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </m.button>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/menu/stores/${product.storeId}`}
      className="group relative flex w-[9.75rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm transition hover:border-primary/35"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <MenuSafeImage
          src={product.imageUrl}
          alt=""
          className="size-full object-cover transition duration-500 group-hover:scale-[1.05]"
          fallback={
            <span className="flex size-full items-center justify-center bg-linear-to-br from-primary/25 to-warning/20 text-primary">
              <Store className="size-6 opacity-60" />
            </span>
          }
        />
        {storeCapsule}
        {badge ? <span className="absolute end-2 bottom-2 z-10">{badge}</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <p className="line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-snug text-foreground">
          {product.name}
        </p>
        <div className="mt-auto flex items-end justify-between gap-1.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">
              {formatMoney(price)} <span className="text-[10px] font-semibold">{t("menu.currency")}</span>
            </p>
            {discounted ? (
              <p className="truncate text-[10px] text-muted-foreground line-through">
                {formatMoney(product.price)}
              </p>
            ) : null}
          </div>
          <m.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onAdd}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-sm transition",
              added ? "bg-emerald-500" : "bg-primary",
            )}
            aria-label={t("menu.discoveryAdd")}
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </m.button>
        </div>
      </div>
    </Link>
  );
}
