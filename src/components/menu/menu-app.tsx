"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  ArrowRight,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Pencil,
  Search,
  UtensilsCrossed,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CustomOrderFloat } from "@/components/menu/custom-order-float";
import { MenuCategoryBar } from "@/components/menu/menu-category-bar";
import { MenuOffersSlider } from "@/components/menu/menu-offers-slider";
import { MenuPersistentCart } from "@/components/menu/menu-persistent-cart";
import { MenuProductDetailsModal } from "@/components/menu/menu-product-details-modal";
import { MenuProductCard } from "@/components/menu/menu-product-card";
import { MenuProductSkeleton } from "@/components/menu/menu-product-skeleton";
import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { MenuViewSwitcher } from "@/components/menu/menu-view-switcher";
import { SpecialOrderSheet } from "@/components/menu/special-order-sheet";
import { useLocale } from "@/components/providers/locale-provider";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  emptyCheckoutDraft,
  locationLabel,
  readCheckoutDraft,
  writeCheckoutDraft,
  type MenuCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import {
  lastLineKeyForProduct,
  quantityForProduct,
  type MenuCartLine,
} from "@/lib/stores/menu-cart";
import {
  cartLineKey,
  composedProductName,
  hasConfigurableOptions,
  optionSummary,
  type ProductOptionSelection,
} from "@/lib/stores/product-options";
import {
  DEFAULT_MENU_VIEW,
  menuProductGridClass,
  readMenuViewMode,
  writeMenuViewMode,
  type MenuViewMode,
} from "@/lib/stores/menu-view";
import { applyOfferToProduct, offerAppliesToProduct } from "@/lib/stores/offer-types";
import type { PublicOffer } from "@/lib/stores/offer-types";
import { storeTypeIcon } from "@/lib/stores/category-icon";
import { storeAllowsCustomOrders } from "@/lib/stores/custom-order";
import { effectiveProductPrice } from "@/lib/stores/pricing";
import type { MenuProduct, MenuStore } from "@/lib/stores/types";
import { cn } from "@/lib/utils";
import { reportMenuSearch } from "@/lib/stores/menu-signals";
import { useMenuCartStore } from "@/stores/menu-cart-store";

export function MenuApp({
  store,
  phone,
  offerId,
  dineIn,
}: {
  store: MenuStore;
  phone: string;
  offerId?: string;
  dineIn?: { tableId: string; tableLabel: string } | null;
}): ReactNode {
  const isDineIn = Boolean(dineIn);
  const { t } = useLocale();
  const lines = useMenuCartStore((state) => state.lines);
  const add = useMenuCartStore((state) => state.add);
  const addMany = useMenuCartStore((state) => state.addMany);
  const remove = useMenuCartStore((state) => state.remove);
  const [activeCategory, setActiveCategory] = useState(store.categories[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<MenuViewMode>(DEFAULT_MENU_VIEW);
  const [switchingView, setSwitchingView] = useState(false);
  const [draft, setDraft] = useState<MenuCheckoutDraft>(() => emptyCheckoutDraft(phone));
  const [hydrated, setHydrated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<MenuProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const tabRowRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const switchTimer = useRef<number | null>(null);
  const claimedOffer = useRef<string | null>(null);

  const locate = useCallback(
    (overwriteStreet: boolean): void => {
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
            street: overwriteStreet || !current.street.trim() ? (label ?? current.street) : current.street,
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
    },
    [t],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = readCheckoutDraft(phone);
    setDraft((current) => ({
      ...saved,
      phone: phone.trim() || saved.phone || current.phone,
    }));
    setViewMode(readMenuViewMode());
    setHydrated(true);
  }, [phone]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeCheckoutDraft(draft);
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated || isDineIn) {
      return;
    }
    if (draft.latitude != null && draft.longitude != null) {
      return;
    }
    locate(false);
  }, [draft.latitude, draft.longitude, hydrated, isDineIn, locate]);

  useEffect(() => {
    return () => {
      if (switchTimer.current != null) {
        window.clearTimeout(switchTimer.current);
      }
    };
  }, []);

  const changeViewMode = (mode: MenuViewMode): void => {
    if (mode === viewMode) {
      return;
    }
    setViewMode(mode);
    writeMenuViewMode(mode);
    setSwitchingView(true);
    if (switchTimer.current != null) {
      window.clearTimeout(switchTimer.current);
    }
    switchTimer.current = window.setTimeout(() => {
      setSwitchingView(false);
      switchTimer.current = null;
    }, 240);
  };

  const openSearch = (): void => {
    setSearchOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 40);
  };

  const closeSearch = (): void => {
    setSearchOpen(false);
    setSearch("");
  };

  const toCartLine = (
    product: MenuProduct,
    selection?: ProductOptionSelection,
    unitPrice?: number,
  ): Omit<MenuCartLine, "quantity"> => {
    const chosen = selection ?? { valueIds: [], note: "" };
    const summary = optionSummary(product.optionGroups ?? [], chosen);
    return {
      lineKey: cartLineKey(product.id, chosen),
      productId: product.id,
      storeId: store.id,
      storeName: store.name,
      storeLogoUrl: store.logoUrl,
      storeLat: store.latitude,
      storeLng: store.longitude,
      name: composedProductName(product.name, summary),
      price: unitPrice ?? effectiveProductPrice(product),
      imageUrl: product.imageUrl,
      optionValueIds: chosen.valueIds,
      optionSummary: summary,
      note: chosen.note,
    };
  };

  const quantityFor = (productId: string): number => quantityForProduct(lines, productId);

  const addProducts = (products: MenuProduct[]): void => {
    if (products.length === 0) {
      return;
    }
    const ready = products.filter((product) => !hasConfigurableOptions(product.optionGroups ?? []));
    const firstConfigurable = products.find((product) => hasConfigurableOptions(product.optionGroups ?? []));
    if (ready.length > 0) {
      addMany(ready.map((product) => ({ line: toCartLine(product), quantity: 1 })));
    }
    if (firstConfigurable) {
      setDetailsProduct(firstConfigurable);
    }
  };

  const addProduct = (product: MenuProduct): void => {
    if (hasConfigurableOptions(product.optionGroups ?? [])) {
      setDetailsProduct(product);
      return;
    }
    addProducts([product]);
  };

  const removeProduct = (productId: string): void => {
    const key = lastLineKeyForProduct(lines, productId);
    if (key) {
      remove(key);
    }
  };

  const itemCount = lines.reduce((sum, item) => sum + item.quantity, 0);
  const allowsCustom = storeAllowsCustomOrders(store.storeType);
  const query = search.trim().toLowerCase();
  const StoreTypeIcon = storeTypeIcon(store.storeType.icon);

  const visibleCategories = useMemo(() => {
    const matched = !query
      ? store.categories
      : store.categories
          .map((category) => ({
            ...category,
            products: category.products.filter(
              (product) =>
                product.name.toLowerCase().includes(query) ||
                product.description.toLowerCase().includes(query),
            ),
          }))
          .filter((category) => category.products.length > 0);

    return matched.map((category) => ({
      ...category,
      products: category.products.map((product) =>
        applyOfferToProduct(product, category.id, store.offers ?? [], now),
      ),
    }));
  }, [now, query, store]);

  useEffect(() => {
    if (query.length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      const results = visibleCategories.reduce((sum, category) => sum + category.products.length, 0);
      reportMenuSearch({ query, storeId: store.id, city: store.city, results });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [query, store.city, store.id, visibleCategories]);

  useEffect(() => {
    if (visibleCategories.length === 0) {
      return;
    }
    if (!visibleCategories.some((category) => category.id === activeCategory)) {
      setActiveCategory(visibleCategories[0].id);
    }
  }, [activeCategory, visibleCategories]);

  useEffect(() => {
    if (query) {
      return;
    }

    const nodes = visibleCategories
      .map((category) => document.getElementById(`cat-${category.id}`))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible) {
          setActiveCategory(visible.target.id.replace("cat-", ""));
        }
      },
      { rootMargin: "-160px 0px -55% 0px", threshold: [0.12, 0.35, 0.6] },
    );

    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, [query, visibleCategories]);

  const jumpToCategory = (categoryId: string): void => {
    setActiveCategory(categoryId);
    document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const tab = tabRowRef.current?.querySelector(`[data-cat="${categoryId}"]`);
    tab?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const claimOffer = (offer: PublicOffer): void => {
    const nowMs = Date.now();
    const covered: MenuProduct[] = [];
    let firstCategoryId = offer.categoryId;

    for (const category of store.categories) {
      for (const product of category.products) {
        if (!offerAppliesToProduct(offer, product.id, category.id)) {
          continue;
        }
        covered.push(applyOfferToProduct(product, category.id, [offer], nowMs));
        if (!firstCategoryId) {
          firstCategoryId = category.id;
        }
      }
    }

    addProducts(covered);
    if (firstCategoryId) {
      jumpToCategory(firstCategoryId);
    }
  };

  useEffect(() => {
    if (!offerId || claimedOffer.current === offerId) {
      return;
    }
    const offer = store.offers.find((item) => item.id === offerId);
    if (!offer) {
      return;
    }
    claimedOffer.current = offerId;
    claimOffer(offer);
  }, [offerId, store.offers]);

  const headerLabel = locationLabel(draft, t("menu.detectingLocation"));
  const ratingLabel =
    store.rating > 0 ? store.rating.toFixed(1) : t("menu.noRating");

  const dineInHeader = dineIn
    ? t("menu.dineInHeader", { store: store.name, table: dineIn.tableLabel })
    : null;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      {isDineIn ? (
        <header className="glass-strong sticky top-0 z-30 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <UtensilsCrossed className="size-4" />
            </span>
            <p className="min-w-0 flex-1 truncate font-heading text-sm font-semibold">
              {dineInHeader}
            </p>
            <div className="flex items-center gap-0.5 rounded-full bg-background/55 p-0.5">
              <button
                type="button"
                onClick={searchOpen ? closeSearch : openSearch}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full transition-colors",
                  searchOpen
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-label={t("menu.searchAction")}
              >
                {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
              </button>
              <LocaleToggle className="h-8 px-2" />
              <ThemeToggle />
            </div>
          </div>
          <AnimatePresence>
            {searchOpen ? (
              <m.label
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative mt-3 block"
              >
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("menu.search")}
                  className="h-10 w-full rounded-2xl border border-border bg-background/70 ps-9 pe-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </m.label>
            ) : null}
          </AnimatePresence>
          {visibleCategories.length > 0 && !query ? (
            <div className="mt-3">
              <MenuCategoryBar
                categories={visibleCategories}
                activeId={activeCategory}
                storeCover={store.coverImage}
                tabRowRef={tabRowRef}
                onSelect={jumpToCategory}
              />
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          {visibleCategories.length > 0 ? (
            <div className="mt-3">
              <MenuViewSwitcher value={viewMode} onChange={changeViewMode} />
            </div>
          ) : null}
        </header>
      ) : null}
      {isDineIn ? null : (
      <>
      <section className="relative">
        <div className="relative h-48 overflow-hidden">
          <MenuSafeImage
            src={store.coverImage}
            alt=""
            className="absolute inset-0 size-full object-cover"
            fallback={<span className="absolute inset-0 bg-linear-to-br from-primary/80 via-info/45 to-secondary" />}
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-black/35" />
          {isDineIn ? null : (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Link
              href="/menu"
              className="inline-flex items-center gap-1 rounded-full bg-background/75 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase backdrop-blur-md"
            >
              <ArrowRight className="size-3.5 rotate-180 rtl:rotate-0" />
              {t("menu.backToStores")}
            </Link>
            <div className="flex items-center gap-0.5 rounded-full bg-background/75 p-0.5 backdrop-blur-md">
              <Link
                href="/menu/orders"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("menu.trackTitle")}
              >
                <ClipboardList className="size-4" />
              </Link>
              <LocaleToggle className="h-8 px-2" />
              <ThemeToggle />
            </div>
          </div>
          )}
        </div>
        <div className="relative -mt-12 px-4">
          <div className="flex items-end gap-3">
            <div className="relative size-[4.75rem] shrink-0 overflow-hidden rounded-full bg-background shadow-[0_12px_32px_-12px_oklch(0.2_0.08_195/0.55)] ring-4 ring-background">
              <MenuSafeImage
                src={store.logoUrl}
                alt={store.name}
                className="size-full object-cover"
                fallback={
                  <span className="flex size-full items-center justify-center bg-primary/12 text-primary">
                    <StoreTypeIcon className="size-7" />
                  </span>
                }
              />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate font-heading text-xl font-semibold tracking-tight">{store.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>{store.storeType.name}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="size-3.5 fill-warning text-warning" />
                  {ratingLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <header className="glass-strong sticky top-0 z-30 mt-3 border-y px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCheckoutOpen(true);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-background/55 px-3 py-2 text-start"
          >
            {locating && !dineIn ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
            ) : dineIn ? (
              <UtensilsCrossed className="size-4 shrink-0 text-primary" />
            ) : (
              <MapPin className="size-4 shrink-0 text-primary" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {dineIn ? t("menu.dineInTo") : t("menu.deliverTo")}
              </span>
              <span className="block truncate text-sm font-semibold">
                {dineIn
                  ? t("menu.dineInBanner", { table: dineIn.tableLabel })
                  : !hydrated || locating
                    ? t("menu.detectingLocation")
                    : headerLabel}
              </span>
            </span>
            <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={searchOpen ? closeSearch : openSearch}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border transition-colors",
              searchOpen
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background/55 text-foreground hover:bg-muted",
            )}
            aria-label={t("menu.searchAction")}
          >
            {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
          </button>
        </div>

        <AnimatePresence>
          {searchOpen ? (
            <m.label
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative mt-3 block"
            >
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("menu.search")}
                className="h-10 w-full rounded-2xl border border-border bg-background/70 ps-9 pe-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </m.label>
          ) : null}
        </AnimatePresence>

        {visibleCategories.length > 0 && !query ? (
          <div className="mt-3">
            <MenuCategoryBar
              categories={visibleCategories}
              activeId={activeCategory}
              storeCover={store.coverImage}
              tabRowRef={tabRowRef}
              customStory={
                allowsCustom
                  ? { title: t("menu.customStory"), hint: t("menu.customStoryHint") }
                  : undefined
              }
              onCustomStory={
                allowsCustom
                  ? () => {
                      setError(null);
                      setSpecialOpen(true);
                    }
                  : undefined
              }
              onSelect={jumpToCategory}
            />
          </div>
        ) : null}

        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

        {visibleCategories.length > 0 ? (
          <div className="mt-3">
            <MenuViewSwitcher value={viewMode} onChange={changeViewMode} />
          </div>
        ) : null}
      </header>
      </>
      )}

        <MenuOffersSlider offers={store.offers ?? []} onClaim={claimOffer} />

      <main
        className={cn(
          "space-y-6 px-4 py-4",
          itemCount > 0
            ? allowsCustom && !isDineIn
              ? "pb-40"
              : "pb-32"
            : allowsCustom && !isDineIn
              ? "pb-24"
              : "pb-10",
        )}
      >
        {visibleCategories.length === 0 ? (
          <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-muted-foreground">
            {query ? t("menu.searchEmpty") : t("menu.closed")}
          </p>
        ) : null}

        <AnimatePresence mode="wait">
          {switchingView ? (
            <m.div
              key={`skeleton-${viewMode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <MenuProductSkeleton mode={viewMode} />
            </m.div>
          ) : (
            <m.div
              key={`products-${viewMode}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {visibleCategories.map((category) => (
                <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-48 space-y-3">
                  <h2 className="font-heading text-lg font-semibold">{category.name}</h2>
                  <div className={menuProductGridClass(viewMode)}>
                    {category.products.map((product) => (
                      <MenuProductCard
                        key={product.id}
                        product={product}
                        viewMode={viewMode}
                        quantity={quantityFor(product.id)}
                        onIncrease={() => addProduct(product)}
                        onDecrease={() => removeProduct(product.id)}
                        onOpen={() => setDetailsProduct(product)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </m.div>
          )}
        </AnimatePresence>
      </main>

      <MenuPersistentCart
        draft={draft}
        locating={locating}
        checkoutOpen={checkoutOpen}
        dineIn={
          dineIn
            ? { storeId: store.id, tableId: dineIn.tableId, tableLabel: dineIn.tableLabel }
            : null
        }
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onLocate={() => locate(true)}
        onCheckoutOpenChange={setCheckoutOpen}
      />

      <MenuProductDetailsModal
        product={detailsProduct}
        storeName={store.name}
        onClose={() => setDetailsProduct(null)}
        onAdd={(product, selection, quantity, unitPrice) => {
          add(toCartLine(product, selection, unitPrice), quantity);
        }}
      />

      <CustomOrderFloat
        visible={allowsCustom && !isDineIn}
        lifted={itemCount > 0}
        hidden={checkoutOpen || specialOpen}
        onPress={() => {
          setError(null);
          setSpecialOpen(true);
        }}
      />

      {allowsCustom && !isDineIn ? (
        <SpecialOrderSheet
          open={specialOpen}
          storeId={store.id}
          storeName={store.name}
          draft={draft}
          locating={locating}
          pending={false}
          error={error}
          onClose={() => setSpecialOpen(false)}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          onLocate={() => locate(true)}
          onError={setError}
        />
      ) : null}
    </div>
  );
}
