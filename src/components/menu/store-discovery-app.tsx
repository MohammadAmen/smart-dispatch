"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  Bookmark,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  Star,
  Store,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { MenuOffersSlider } from "@/components/menu/menu-offers-slider";
import { MenuPersistentCart } from "@/components/menu/menu-persistent-cart";
import { WorthTryingRail } from "@/components/menu/worth-trying-rail";
import { useLocale } from "@/components/providers/locale-provider";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { calculateDistance } from "@/lib/geo";
import {
  emptyCheckoutDraft,
  locationLabel,
  readCheckoutDraft,
  writeCheckoutDraft,
  type MenuCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import { reportMenuSearch } from "@/lib/stores/menu-signals";
import { storeTypeIcon } from "@/lib/stores/store-type-icon";
import type { PublicOffer } from "@/lib/stores/offer-types";
import type { DirectoryStore, StoreTypeRecord } from "@/lib/stores/types";
import { cn } from "@/lib/utils";
import { useSavedStoresStore } from "@/stores/saved-stores-store";

const SavedStoresSheet = dynamic(
  () => import("@/components/menu/saved-stores-sheet").then((mod) => mod.SavedStoresSheet),
  { ssr: false },
);

export function StoreDiscoveryApp({
  stores,
  storeTypes,
  offers,
  phone,
}: {
  stores: DirectoryStore[];
  storeTypes: StoreTypeRecord[];
  offers: PublicOffer[];
  phone: string;
}): ReactNode {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState<MenuCheckoutDraft>(() => emptyCheckoutDraft(phone));
  const [hydrated, setHydrated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const hydrateSaved = useSavedStoresStore((state) => state.hydrate);
  const savedCount = useSavedStoresStore((state) => state.stores.length);

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

  const ranked = useMemo(() => {
    const query = search.trim().toLowerCase();
    const originLat = draft.latitude;
    const originLng = draft.longitude;

    return stores
      .filter((store) => {
        if (typeId !== "all" && store.storeType.id !== typeId) {
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
  }, [draft.latitude, draft.longitude, search, stores, typeId]);

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
      <header className="glass-strong sticky top-0 z-30 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
            Smart Dispatch
          </p>
          <div className="flex items-center gap-1.5">
            <div className="glass flex items-center gap-0.5 rounded-2xl px-0.5 py-0.5">
              <LocaleToggle compact className="rounded-xl text-muted-foreground hover:bg-background/55 hover:text-foreground" />
              <ThemeToggle className="rounded-xl text-muted-foreground hover:bg-background/55 hover:text-foreground" />
            </div>
            <div className="glass flex items-center gap-0.5 rounded-2xl px-0.5 py-0.5">
              <button
                type="button"
                onClick={() => setSavedOpen(true)}
                className="relative inline-flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-background/55 hover:text-foreground"
                aria-label={t("menu.savedStores")}
              >
                <Bookmark className={cn("size-4", savedCount > 0 && "fill-teal-500 text-teal-600")} />
                {savedCount > 0 ? (
                  <span className="absolute -top-0.5 -end-0.5 inline-flex min-w-3.5 items-center justify-center rounded-full bg-teal-500 px-1 text-[9px] font-bold text-white">
                    {savedCount > 9 ? "9+" : savedCount}
                  </span>
                ) : null}
              </button>
              <Link
                href="/menu/orders"
                className="inline-flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-background/55 hover:text-foreground"
                aria-label={t("menu.trackTitle")}
              >
                <ClipboardList className="size-4" />
              </Link>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={locate}
          className="flex w-full items-center gap-2 rounded-2xl bg-background/55 px-3 py-2 text-start"
        >
          {locating ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <MapPin className="size-4 shrink-0 text-primary" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("menu.yourLocation")}
            </span>
            <span className="block truncate text-sm font-semibold">
              {!hydrated || locating ? t("menu.detectingLocation") : headerLabel}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
            <Navigation className="size-3" />
            {t("menu.changeLocation")}
          </span>
        </button>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("menu.searchStores")}
            className="h-10 w-full rounded-2xl border border-border bg-background/70 ps-9 pe-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TypeChip
          active={typeId === "all"}
          label={t("menu.allTypes")}
          onClick={() => setTypeId("all")}
        />
        {storeTypes.map((type) => {
          const Icon = storeTypeIcon(type.icon);
          return (
            <TypeChip
              key={type.id}
              active={typeId === type.id}
              label={type.name}
              icon={<Icon className="size-3.5" />}
              onClick={() => setTypeId(type.id)}
            />
          );
        })}
      </div>

      <WorthTryingRail typeId={typeId} />

      <MenuOffersSlider
        offers={offers}
        storeHint
        onClaim={(offer) => {
          router.push(`/menu/stores/${offer.storeId}?offer=${encodeURIComponent(offer.id)}`);
        }}
      />

      <main className="space-y-3 px-4 pb-32">
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-heading text-xl font-semibold">{t("menu.nearbyStores")}</h1>
          <p className="text-xs text-muted-foreground">{ranked.length}</p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {ranked.length === 0 ? (
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
                <StoreCard store={store} distanceKm={distanceKm} locale={locale} t={t} />
              </m.div>
            ))}
          </AnimatePresence>
        )}
      </main>

      <MenuPersistentCart
        draft={draft}
        locating={locating}
        checkoutOpen={checkoutOpen}
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onLocate={locate}
        onCheckoutOpenChange={setCheckoutOpen}
      />
      <SavedStoresSheet open={savedOpen} onClose={() => setSavedOpen(false)} />
    </div>
  );
}

function TypeChip({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background/60 text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StoreCard({
  store,
  distanceKm,
  locale,
  t,
}: {
  store: DirectoryStore;
  distanceKm: number;
  locale: string;
  t: (path: string, vars?: Record<string, string | number>) => string;
}): ReactNode {
  const Icon = storeTypeIcon(store.storeType.icon);
  const ratingLabel =
    store.rating > 0
      ? store.rating.toFixed(1)
      : t("menu.noRating");
  const distanceLabel = Number.isFinite(distanceKm)
    ? t("menu.distanceKm", {
        value: locale === "ar" ? distanceKm.toFixed(1) : distanceKm.toFixed(1),
      })
    : t("menu.distanceUnknown");

  return (
    <Link
      href={`/menu/stores/${store.id}`}
      className="glass block overflow-hidden rounded-3xl"
    >
      {store.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.coverImage} alt="" className="h-24 w-full object-cover" />
      ) : (
        <div className="h-16 bg-gradient-to-l from-primary/15 to-transparent" />
      )}
      <div className="flex items-center gap-3 p-4">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logoUrl}
            alt=""
            className="-mt-10 size-16 rounded-full border-4 border-background object-cover shadow-sm"
          />
        ) : (
          <span className="-mt-10 flex size-16 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-primary shadow-sm">
            <Icon className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-base font-semibold">{store.name}</h2>
          <p className="truncate text-xs text-muted-foreground">{store.storeType.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star className="size-3.5 fill-current" />
              {ratingLabel}
            </span>
            <span className="text-muted-foreground">{distanceLabel}</span>
          </div>
        </div>
        <Store className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
