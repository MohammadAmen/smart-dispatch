"use client";

import { Flame } from "lucide-react";
import { type ReactNode } from "react";
import useSWR from "swr";

import { StoreMegaDealsCard } from "@/components/menu/store-mega-deals-card";
import { useLocale } from "@/components/providers/locale-provider";
import { burnDealsKey, fetchBurnDeals } from "@/lib/stores/burn-deals-query";

function BurnDealsSkeleton(): ReactNode {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-3xl border border-border/60">
          <div className="h-24 animate-pulse bg-muted/80" />
          <div className="space-y-3 p-3.5">
            <div className="flex items-center gap-3">
              <div className="size-14 animate-pulse rounded-2xl bg-muted/80" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted/80" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
            <div className="flex gap-2.5 overflow-hidden">
              {Array.from({ length: 4 }, (_, card) => (
                <div key={card} className="h-[8.5rem] w-[7.25rem] shrink-0 animate-pulse rounded-2xl bg-muted/75" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BurnDealsSection({
  categoryType,
  storeIdsFilter = null,
}: {
  categoryType: string;
  storeIdsFilter?: string[] | null;
}): ReactNode {
  const { t } = useLocale();
  const category = categoryType === "all" ? "ALL" : categoryType;
  const key = burnDealsKey(category);

  const { data, isLoading } = useSWR(key, () => fetchBurnDeals(category), {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 20_000,
    keepPreviousData: true,
  });

  const stores = data?.stores ?? [];
  const loading = isLoading && !data;
  const visible =
    storeIdsFilter && storeIdsFilter.length > 0
      ? stores.filter((store) => storeIdsFilter.includes(store.storeId))
      : stores;

  return (
    <section className="space-y-3 px-4 pb-32">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Flame className="size-4 animate-pulse text-rose-500" />
          <h1 className="font-heading text-xl font-semibold">{t("menu.burnTitle")}</h1>
        </div>
        {!loading ? (
          <p className="text-xs text-muted-foreground">{visible.length}</p>
        ) : null}
      </div>

      {loading ? <BurnDealsSkeleton /> : null}

      {!loading && visible.length === 0 ? (
        <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-muted-foreground">
          {t("menu.burnEmpty")}
        </p>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((store) => (
            <StoreMegaDealsCard key={store.storeId} store={store} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
