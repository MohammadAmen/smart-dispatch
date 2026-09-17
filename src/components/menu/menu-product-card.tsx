"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

import { DiscountBadge } from "@/components/stores/discount-badge";
import { MenuQtyControl } from "@/components/menu/menu-qty-control";
import { ProductImageSlider } from "@/components/menu/product-image-slider";
import { useLocale } from "@/components/providers/locale-provider";
import { ProductPrice } from "@/components/stores/product-price";
import { discountPercentOff } from "@/lib/stores/pricing";
import type { MenuViewMode } from "@/lib/stores/menu-view";
import { productImages } from "@/lib/stores/product-images";
import type { MenuProduct } from "@/lib/stores/types";

export function MenuProductCard({
  product,
  quantity,
  viewMode,
  onIncrease,
  onDecrease,
  onOpen,
}: {
  product: MenuProduct;
  quantity: number;
  viewMode: MenuViewMode;
  onIncrease: () => void;
  onDecrease: () => void;
  onOpen: () => void;
}): ReactNode {
  const { t } = useLocale();
  const percent = discountPercentOff(product);

  if (viewMode === "list") {
    return (
      <m.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative flex cursor-pointer items-stretch gap-3 overflow-hidden rounded-2xl p-2"
        onClick={onOpen}
      >
        <div className="relative size-[5.5rem] shrink-0 overflow-hidden rounded-2xl bg-muted">
          <ProductPhoto product={product} />
          {percent ? (
            <DiscountBadge
              pulse
              label={t("menu.off", { percent })}
              className="absolute start-1.5 top-2 z-10"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 pe-1">
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-semibold leading-snug">{product.name}</h3>
            {product.description ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{product.description}</p>
            ) : null}
          </div>
          <div className="flex items-end justify-between gap-3">
            <ProductPrice product={product} size="sm" />
            <span onClick={(event) => event.stopPropagation()}>
              <MenuQtyControl quantity={quantity} onIncrease={onIncrease} onDecrease={onDecrease} />
            </span>
          </div>
        </div>
      </m.article>
    );
  }

  if (viewMode === "dense") {
    return (
      <m.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="glass cursor-pointer overflow-hidden rounded-2xl"
        onClick={onOpen}
      >
        <div className="relative aspect-square bg-muted">
          <ProductPhoto product={product} />
          {percent ? (
            <DiscountBadge
              pulse
              label={t("menu.off", { percent })}
              className="absolute start-1.5 top-2 z-10"
            />
          ) : null}
          <div className="absolute end-1.5 bottom-1.5" onClick={(event) => event.stopPropagation()}>
            <MenuQtyControl
              size="sm"
              quantity={quantity}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
            />
          </div>
        </div>
        <div className="space-y-1 p-2.5">
          <h3 className="line-clamp-2 font-heading text-[13px] font-semibold leading-snug">{product.name}</h3>
          <ProductPrice product={product} size="sm" />
        </div>
      </m.article>
    );
  }

  return (
    <m.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="glass cursor-pointer overflow-hidden rounded-3xl"
      onClick={onOpen}
    >
      <div className="relative aspect-[16/10] bg-muted">
        <ProductPhoto product={product} showArrows />
        {percent ? (
          <DiscountBadge
            pulse
            label={t("menu.off", { percent })}
            className="absolute start-3 top-3 z-10"
          />
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold leading-snug">{product.name}</h3>
          {product.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-3">
          <ProductPrice product={product} />
          <span onClick={(event) => event.stopPropagation()}>
            <MenuQtyControl quantity={quantity} onIncrease={onIncrease} onDecrease={onDecrease} />
          </span>
        </div>
      </div>
    </m.article>
  );
}

function ProductPhoto({
  product,
  showArrows = false,
}: {
  product: MenuProduct;
  showArrows?: boolean;
}): ReactNode {
  return (
    <ProductImageSlider
      images={productImages(product)}
      alt={product.name}
      showArrows={showArrows}
    />
  );
}
