"use client";

import { Flame, Percent, Sparkles, Tag } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import useSWR from "swr";

import { ShowcaseProductCard } from "@/components/menu/showcase-product-card";
import { useLocale } from "@/components/providers/locale-provider";
import { baseCartExtras } from "@/lib/stores/menu-cart";
import { discoveryKey, fetchDiscoveryFeed } from "@/lib/stores/discovery-query";
import type { DiscoveryProduct } from "@/lib/stores/discovery-types";
import { effectiveProductPrice } from "@/lib/stores/pricing";
import {
  cartLineKey,
  composedProductName,
  hasConfigurableOptions,
  optionSummary,
  type ProductOptionSelection,
} from "@/lib/stores/product-options";
import type { MenuProduct } from "@/lib/stores/types";
import { useMenuCartStore } from "@/stores/menu-cart-store";

const MenuProductDetailsModal = dynamic(
  () =>
    import("@/components/menu/menu-product-details-modal").then((mod) => mod.MenuProductDetailsModal),
  { ssr: false },
);

function toMenuProduct(product: DiscoveryProduct): MenuProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    hasDiscount: product.hasDiscount,
    discountPrice: product.discountPrice,
    imageUrl: product.imageUrl,
    images: product.images ?? [],
    available: true,
    optionGroups: product.optionGroups ?? [],
  };
}

function DiscoverySkeleton({ horizontal = false }: { horizontal?: boolean }): ReactNode {
  const cards = Array.from({ length: 4 }, (_, index) => index);
  return (
    <div className="flex gap-3 overflow-hidden px-4">
      {cards.map((index) => (
        <div
          key={index}
          className={
            horizontal
              ? "h-[6.25rem] w-[17.5rem] shrink-0 animate-pulse rounded-2xl bg-muted/80"
              : "h-[13.5rem] w-[9.75rem] shrink-0 animate-pulse rounded-2xl bg-muted/80"
          }
        />
      ))}
    </div>
  );
}

function DiscoveryRail({
  title,
  icon,
  products,
  orientation = "vertical",
  loading,
  onAddRequest,
}: {
  title: string;
  icon: ReactNode;
  products: DiscoveryProduct[];
  orientation?: "vertical" | "horizontal";
  loading: boolean;
  onAddRequest: (product: DiscoveryProduct) => void;
}): ReactNode {
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-1.5 px-4">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {loading ? (
        <DiscoverySkeleton horizontal={orientation === "horizontal"} />
      ) : (
        <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product) => (
            <ShowcaseProductCard
              key={product.id}
              product={product}
              orientation={orientation}
              onAddRequest={onAddRequest}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Public marketplace discovery feed only — mount from StoreDiscoveryApp,
 * never from the per-store / table MenuApp.
 */
export function DiscoveryFeed({
  category,
  lat,
  lng,
  subCategoryId = null,
}: {
  category: string;
  lat: number | null;
  lng: number | null;
  subCategoryId?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const add = useMenuCartStore((state) => state.add);
  const [detailsProduct, setDetailsProduct] = useState<DiscoveryProduct | null>(null);
  const isAll = category === "all" || category === "ALL" || !category;
  const resolvedCategory = isAll ? "ALL" : category;
  const resolvedSub = subCategoryId?.trim() || null;
  const key = discoveryKey(resolvedCategory, lat, lng, resolvedSub);

  const { data, isLoading } = useSWR(
    key,
    () => fetchDiscoveryFeed(resolvedCategory, lat, lng, resolvedSub),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    },
  );

  const addSimple = useCallback(
    (product: DiscoveryProduct): void => {
      add({
        ...baseCartExtras(product.id),
        productId: product.id,
        storeId: product.storeId,
        storeName: product.storeName,
        storeLogoUrl: product.storeLogoUrl,
        storeLat: product.storeLat,
        storeLng: product.storeLng,
        name: product.name,
        price: effectiveProductPrice(product),
        imageUrl: product.imageUrl,
      });
    },
    [add],
  );

  const onAddRequest = useCallback(
    (product: DiscoveryProduct): void => {
      if (hasConfigurableOptions(product.optionGroups ?? [])) {
        setDetailsProduct(product);
        return;
      }
      addSimple(product);
    },
    [addSimple],
  );

  const onModalAdd = useCallback(
    (
      menuProduct: MenuProduct,
      selection: ProductOptionSelection,
      quantity: number,
      unitPrice: number,
    ): void => {
      if (!detailsProduct) {
        return;
      }
      const summary = optionSummary(menuProduct.optionGroups ?? [], selection);
      add(
        {
          lineKey: cartLineKey(menuProduct.id, selection),
          productId: menuProduct.id,
          storeId: detailsProduct.storeId,
          storeName: detailsProduct.storeName,
          storeLogoUrl: detailsProduct.storeLogoUrl,
          storeLat: detailsProduct.storeLat,
          storeLng: detailsProduct.storeLng,
          name: composedProductName(menuProduct.name, summary),
          price: unitPrice,
          imageUrl: menuProduct.imageUrl,
          optionValueIds: selection.valueIds,
          optionSummary: summary,
          note: selection.note,
        },
        quantity,
      );
      setDetailsProduct(null);
    },
    [add, detailsProduct],
  );

  const trending = data?.trending ?? [];
  const deals = data?.deals ?? [];
  const newArrivals = data?.newArrivals ?? [];
  const curated = data?.curated ?? [];
  const loading = isLoading && !data;

  if (!loading && trending.length === 0 && deals.length === 0 && newArrivals.length === 0) {
    return null;
  }

  const rails = isAll ? (
    <div className="space-y-4 py-2">
      <DiscoveryRail
        title={t("menu.discoveryCurated")}
        icon={<Flame className="size-3.5" />}
        products={curated.length > 0 ? curated : trending}
        loading={loading}
        onAddRequest={onAddRequest}
      />
      <DiscoveryRail
        title={t("menu.discoveryFlashDeals")}
        icon={<Tag className="size-3.5" />}
        products={deals}
        orientation="horizontal"
        loading={loading}
        onAddRequest={onAddRequest}
      />
    </div>
  ) : (
    <div className="space-y-4 py-2">
      <DiscoveryRail
        title={t("menu.discoveryTrending")}
        icon={<Flame className="size-3.5" />}
        products={trending}
        loading={loading}
        onAddRequest={onAddRequest}
      />
      <DiscoveryRail
        title={t("menu.discoveryDeals")}
        icon={<Percent className="size-3.5" />}
        products={deals}
        orientation="horizontal"
        loading={loading}
        onAddRequest={onAddRequest}
      />
      <DiscoveryRail
        title={t("menu.discoveryNew")}
        icon={<Sparkles className="size-3.5" />}
        products={newArrivals}
        loading={loading}
        onAddRequest={onAddRequest}
      />
    </div>
  );

  return (
    <>
      {rails}
      <MenuProductDetailsModal
        product={detailsProduct ? toMenuProduct(detailsProduct) : null}
        storeName={detailsProduct?.storeName ?? ""}
        onClose={() => setDetailsProduct(null)}
        onAdd={onModalAdd}
      />
    </>
  );
}
