"use client";

import { Flame, Percent, Sparkles, Tag } from "lucide-react";
import { type ReactNode } from "react";
import useSWR from "swr";

import { ShowcaseProductCard } from "@/components/menu/showcase-product-card";
import { useLocale } from "@/components/providers/locale-provider";
import { discoveryKey, fetchDiscoveryFeed } from "@/lib/stores/discovery-query";
import type { DiscoveryProduct } from "@/lib/stores/discovery-types";

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
}: {
  title: string;
  icon: ReactNode;
  products: DiscoveryProduct[];
  orientation?: "vertical" | "horizontal";
  loading: boolean;
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
            <ShowcaseProductCard key={product.id} product={product} orientation={orientation} />
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
}: {
  category: string;
  lat: number | null;
  lng: number | null;
}): ReactNode {
  const { t } = useLocale();
  const isAll = category === "all" || category === "ALL" || !category;
  const key = discoveryKey(isAll ? "ALL" : category, lat, lng);

  const { data, isLoading } = useSWR(
    key,
    () => fetchDiscoveryFeed(isAll ? "ALL" : category, lat, lng),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    },
  );

  const trending = data?.trending ?? [];
  const deals = data?.deals ?? [];
  const newArrivals = data?.newArrivals ?? [];
  const curated = data?.curated ?? [];
  const loading = isLoading && !data;

  if (!loading && trending.length === 0 && deals.length === 0 && newArrivals.length === 0) {
    return null;
  }

  if (isAll) {
    return (
      <div className="space-y-4 py-2">
        <DiscoveryRail
          title={t("menu.discoveryCurated")}
          icon={<Flame className="size-3.5" />}
          products={curated.length > 0 ? curated : trending}
          loading={loading}
        />
        <DiscoveryRail
          title={t("menu.discoveryFlashDeals")}
          icon={<Tag className="size-3.5" />}
          products={deals}
          orientation="horizontal"
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <DiscoveryRail
        title={t("menu.discoveryTrending")}
        icon={<Flame className="size-3.5" />}
        products={trending}
        loading={loading}
      />
      <DiscoveryRail
        title={t("menu.discoveryDeals")}
        icon={<Percent className="size-3.5" />}
        products={deals}
        orientation="horizontal"
        loading={loading}
      />
      <DiscoveryRail
        title={t("menu.discoveryNew")}
        icon={<Sparkles className="size-3.5" />}
        products={newArrivals}
        loading={loading}
      />
    </div>
  );
}
