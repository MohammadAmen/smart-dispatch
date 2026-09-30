"use client";

import { AnimatePresence, m } from "framer-motion";
import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";

import { MenuOffersSlider } from "@/components/menu/menu-offers-slider";
import { BurnDealsSection } from "@/components/menu/burn-deals-section";
import { DiscoveryFeed } from "@/components/menu/discovery-feed";
import { MenuCinematicHeader } from "@/components/menu/menu-cinematic-header";
import { SubCategoryPillsBar } from "@/components/menu/sub-category-pills-bar";
import { NearbyStoreCard } from "@/components/menu/nearby-store-card";
import { WorthTryingRail } from "@/components/menu/worth-trying-rail";
import { useLocale } from "@/components/providers/locale-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { calculateDistance } from "@/lib/geo";
import {
  DEFAULT_DELIVERY_TIERS,
  type DeliveryTier,
} from "@/lib/platform/delivery-tiers";
import {
  emptyCheckoutDraft,
  locationLabel,
  readCheckoutDraft,
  writeCheckoutDraft,
  type MenuCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import { fetchMenuStores, menuStoresKey } from "@/lib/stores/menu-stores-query";
import { reportMenuSearch } from "@/lib/stores/menu-signals";
import { storeTypeIcon } from "@/lib/stores/store-type-icon";
import type { PublicOffer } from "@/lib/stores/offer-types";
import type { PublicSubCategory } from "@/lib/stores/global-categories-types";
import type { DirectoryStore, StoreTypeRecord } from "@/lib/stores/types";
import { cn } from "@/lib/utils";
import { useSavedStoresStore } from "@/stores/saved-stores-store";

export function StoreDiscoveryApp({
  stores,
  storeTypes,
  offers,
  phone,
  headerBackgroundUrl = null,
  deliveryTiers = DEFAULT_DELIVERY_TIERS,
}: {
  stores: DirectoryStore[];
  storeTypes: StoreTypeRecord[];
  offers: PublicOffer[];
  phone: string;
  headerBackgroundUrl?: string | null;
  deliveryTiers?: DeliveryTier[];
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState<MenuCheckoutDraft>(() => emptyCheckoutDraft(phone));
  const [hydrated, setHydrated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState("all");
  const [burnActive, setBurnActive] = useState(false);
  const [subCategory, setSubCategory] = useState<PublicSubCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hydrateSaved = useSavedStoresStore((state) => state.hydrate);

  const locate = useCallback((): void => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(t("menu.gpsUnavailable"));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        let label: string | null = null;
        try {
          const response = await fetch(
            `/api/menu/geocode?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`,
            { cache: "no-store" },
          );
          const body = (await response.json()) as { ok?: boolean; label?: string | null };
          label = body.label ?? null;
        } catch {
          label = null;
        }

        setDraft((current) => ({
          ...current,
          latitude,
          longitude,
          labeledAddress: label ?? current.labeledAddress,
          street: label ?? current.street,
        }));
        setLocating(false);
        setError(null);
      },
      () => {
        setLocating(false);
        setError(t("menu.gpsDenied"));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }, [t]);

  useEffect(() => {
    const saved = readCheckoutDraft(phone);
    setDraft((current) => ({
      ...saved,
      phone: phone.trim() || saved.phone || current.phone,
    }));
    hydrateSaved();
    setHydrated(true);
  }, [hydrateSaved, phone]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeCheckoutDraft(draft);
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (draft.latitude != null && draft.longitude != null) {
      return;
    }
    locate();
  }, [draft.latitude, draft.longitude, hydrated, locate]);

  const selectedSubCategoryId = subCategory?.id ?? null;
  const storeIdsFilter = subCategory?.storeIds ?? null;
  const debouncedStoreIds = useDebouncedValue(storeIdsFilter, 160);

  // One cached fetch per main type — type + sub filters apply client-side immediately.
  const { data: liveStores, isLoading: storesLoading } = useSWR(
    menuStoresKey(typeId, null),
    () => fetchMenuStores(typeId, null),
    {
      fallbackData: typeId === "all" ? stores : undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    },
  );

  const directoryStores = useMemo(() => {
    const source = liveStores ?? stores;
    if (typeId === "all" || typeId === "ALL") {
      return source;
    }
    // KeepPreviousData can briefly expose the previous type — clamp to selection.
    return source.filter((store) => store.storeType.id === typeId);
  }, [liveStores, stores, typeId]);

  const showStoresSkeleton = storesLoading && !liveStores;

  const typeStoreIdSet = useMemo(() => {
    if (typeId === "all" || typeId === "ALL") {
      return null;
    }
    return new Set(directoryStores.map((store) => store.id));
  }, [directoryStores, typeId]);

  const subStoreIdSet = useMemo(() => {
    if (debouncedStoreIds == null) {
      return null;
    }
    return new Set(debouncedStoreIds);
  }, [debouncedStoreIds]);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      if (typeStoreIdSet && !typeStoreIdSet.has(offer.storeId)) {
        return false;
      }
      if (subStoreIdSet && !subStoreIdSet.has(offer.storeId)) {
        return false;
      }
      return true;
    });
  }, [offers, subStoreIdSet, typeStoreIdSet]);

  const ranked = useMemo(() => {
    const query = search.trim().toLowerCase();
    const originLat = draft.latitude;
    const originLng = draft.longitude;

    return directoryStores
      .filter((store) => {
        if (typeId !== "all" && typeId !== "ALL" && store.storeType.id !== typeId) {
          return false;
        }
        if (subStoreIdSet && !subStoreIdSet.has(store.id)) {
          return false;
        }
        if (!query) {
          return true;
        }
        return (
          store.name.toLowerCase().includes(query) ||
          store.storeType.name.toLowerCase().includes(query) ||
          (store.city ?? "").toLowerCase().includes(query)
        );
      })
      .map((store) => {
        const distanceKm =
          originLat != null &&
          originLng != null &&
          store.latitude != null &&
          store.longitude != null
            ? calculateDistance(originLat, originLng, store.latitude, store.longitude)
            : Number.POSITIVE_INFINITY;
        return { store, distanceKm };
      })
      .sort((left, right) => left.distanceKm - right.distanceKm);
  }, [directoryStores, draft.latitude, draft.longitude, search, subStoreIdSet, typeId]);

  useEffect(() => {
    setSubCategory(null);
  }, [typeId]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      reportMenuSearch({
        query,
        city: ranked[0]?.store.city ?? null,
        results: ranked.length,
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [ranked, search]);

  const headerLabel = locationLabel(draft, t("menu.detectingLocation"));

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      <MenuCinematicHeader
        backgroundUrl={headerBackgroundUrl}
        headerLabel={headerLabel}
        hydrated={hydrated}
        locating={locating}
        search={search}
        onLocate={locate}
        onSearchChange={setSearch}
      />

      <div className="flex gap-2 overflow-x-auto border-b border-border/70 bg-background/50 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TypeChip
          active={typeId === "all" && !burnActive}
          label={t("menu.allTypes")}
          icon={
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={BRAND_LOGO_SRC}
              alt=""
              className="size-5 shrink-0 bg-transparent object-contain"
              draggable={false}
            />
          }
          onClick={() => {
            setTypeId("all");
            setBurnActive(false);
            setSubCategory(null);
          }}
        />
        <TypeChip
          active={burnActive}
          label={t("menu.burnTitle")}
          tone="burn"
          icon={<Flame className="size-3.5 animate-pulse fill-current" />}
          onClick={() => setBurnActive((current) => !current)}
        />
        {storeTypes.map((type) => {
          const Icon = storeTypeIcon(type.icon);
          return (
            <TypeChip
              key={type.id}
              active={!burnActive && typeId === type.id}
              label={type.name}
              icon={<Icon className="size-3.5" />}
              onClick={() => {
                setTypeId(type.id);
                setBurnActive(false);
                setSubCategory(null);
              }}
            />
          );
        })}
      </div>

      {typeId !== "all" ? (
        <SubCategoryPillsBar
          mainCategoryId={typeId}
          lat={draft.latitude}
          lng={draft.longitude}
          selectedId={selectedSubCategoryId}
          onSelect={setSubCategory}
        />
      ) : null}

      <WorthTryingRail typeId={typeId} storeIdsFilter={storeIdsFilter} />

      <MenuOffersSlider
        offers={filteredOffers}
        storeHint
        onClaim={(offer) => {
          router.push(`/menu/stores/${offer.storeId}?offer=${encodeURIComponent(offer.id)}`);
        }}
      />

      {!burnActive ? (
        <DiscoveryFeed
          category={typeId}
          lat={draft.latitude}
          lng={draft.longitude}
          subCategoryId={selectedSubCategoryId}
        />
      ) : null}

      {burnActive ? (
        <BurnDealsSection
          categoryType={typeId}
          subCategoryId={selectedSubCategoryId}
        />
      ) : (
      <main className="space-y-3 px-4 pb-32">
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-heading text-xl font-semibold">{t("menu.nearbyStores")}</h1>
          <p className="text-xs text-muted-foreground">{ranked.length}</p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {showStoresSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="h-36 animate-pulse bg-slate-100 dark:bg-slate-900" />
                <div className="space-y-3 px-4 pb-4 pt-8">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-10 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-muted-foreground">
            {t("menu.noStores")}
          </p>
        ) : (
          <AnimatePresence>
            {ranked.map(({ store, distanceKm }, index) => (
              <m.div
                key={store.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <NearbyStoreCard
                  store={store}
                  distanceKm={distanceKm}
                  deliveryTiers={deliveryTiers}
                />
              </m.div>
            ))}
          </AnimatePresence>
        )}
      </main>
      )}

    </div>
  );
}

function TypeChip({
  active,
  label,
  icon,
  tone = "default",
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  tone?: "default" | "burn";
  onClick: () => void;
}): ReactNode {
  const burnActive = tone === "burn" && active;
  const burnIdle = tone === "burn" && !active;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        burnActive &&
          "border-transparent bg-linear-to-r from-rose-600 via-orange-500 to-amber-400 text-white shadow-lg shadow-rose-500/35 ring-2 ring-rose-400/40",
        burnIdle &&
          "border-rose-400/40 bg-rose-500/10 text-rose-600 dark:text-rose-300",
        tone === "default" &&
          active &&
          "border-amber-500 bg-amber-400 text-slate-900 shadow-sm",
        tone === "default" &&
          !active &&
          "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-background/70 dark:text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
