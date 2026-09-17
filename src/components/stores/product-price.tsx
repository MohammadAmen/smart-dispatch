"use client";

import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  isDiscountedProduct,
  type DiscountableProduct,
} from "@/lib/stores/pricing";

export function ProductPrice({
  product,
  className,
  size = "md",
}: {
  product: DiscountableProduct;
  className?: string;
  size?: "sm" | "md";
}): ReactNode {
  const { t } = useLocale();
  const discounted = isDiscountedProduct(product);
  const currency = t("menu.currency");
  const compact = size === "sm";

  if (!discounted) {
    return (
      <p className={cn(compact ? "text-sm font-semibold" : "text-base font-semibold", className)}>
        {formatMoney(product.price)} {currency}
      </p>
    );
  }

  return (
    <p className={cn("flex flex-col items-start gap-1", className)}>
      <span
        className={cn(
          "leading-none font-extrabold tracking-tight text-primary",
          compact ? "text-sm" : "text-lg",
        )}
      >
        {formatMoney(product.discountPrice ?? product.price)} {currency}
      </span>
      <span
        className={cn(
          "leading-none text-muted-foreground/55 line-through decoration-muted-foreground/50",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {formatMoney(product.price)} {currency}
      </span>
    </p>
  );
}
