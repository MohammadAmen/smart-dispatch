"use client";

import { AnimatePresence, m } from "framer-motion";
import { Bookmark, MapPin, Phone, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { savedStoreFromStory } from "@/lib/stores/saved-stores";
import type { PublicStoryStore } from "@/lib/stores/story-types";
import { cn } from "@/lib/utils";
import { useSavedStoresStore } from "@/stores/saved-stores-store";

export function StoreInfoSheet({
  open,
  store,
  onClose,
  onOpenMenu,
}: {
  open: boolean;
  store: PublicStoryStore | null;
  onClose: () => void;
  onOpenMenu: () => void;
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const hydrate = useSavedStoresStore((state) => state.hydrate);
  const saved = useSavedStoresStore((state) =>
    store ? state.stores.some((item) => item.id === store.storeId) : false,
  );
  const toggle = useSavedStoresStore((state) => state.toggle);

  useEffect(() => {
    if (open) {
      hydrate();
    }
  }, [hydrate, open]);

  if (!store) {
    return null;
  }

  const address = [store.storeAddress, store.storeCity].filter(Boolean).join(" · ");

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="fixed inset-0 z-[80] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            aria-label={t("common.close")}
            onClick={onClose}
          />
          <m.section
            role="dialog"
            aria-modal="true"
            aria-label={t("menu.storeInfo")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 w-full max-w-lg overflow-visible rounded-t-3xl border-x border-t pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_48px_-24px_oklch(0.2_0.08_195/0.45)]"
          >
            <div className="relative">
              <div className="h-32 w-full overflow-hidden rounded-t-3xl bg-muted">
                {store.storeCoverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.storeCoverImage}
                    alt=""
                    className="h-32 w-full rounded-t-3xl object-cover"
                  />
                ) : (
                  <div className="h-32 w-full rounded-t-3xl bg-linear-to-l from-teal-500/30 via-emerald-400/15 to-cyan-400/10" />
                )}
              </div>
              <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
                <div className="mx-auto my-2 h-1.5 w-12 rounded-full bg-gray-300/90 dark:bg-gray-700/90" />
              </div>
              <span className="absolute -bottom-8 left-1/2 size-[4.5rem] -translate-x-1/2 overflow-hidden rounded-full bg-background shadow-md ring-4 ring-background">
                {store.storeLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.storeLogoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center font-heading text-xl font-bold text-teal-700 dark:text-teal-300">
                    {store.storeName.slice(0, 1)}
                  </span>
                )}
              </span>
            </div>

            <div className="space-y-4 px-5">
              <div className="mt-10 text-center">
                <h2 className="text-xl font-bold">{store.storeName}</h2>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {store.storeTypeName ? (
                    <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-500/15 dark:text-teal-300">
                      {store.storeTypeName}
                    </span>
                  ) : null}
                  {address ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border/70">
                      <MapPin className="size-3.5 shrink-0 text-teal-600" />
                      <span className="truncate">{address}</span>
                    </span>
                  ) : null}
                  {store.storePhone ? (
                    <a
                      href={`tel:${store.storePhone}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-700 ring-1 ring-teal-500/20 transition hover:bg-teal-500/15 dark:text-teal-300"
                    >
                      <Phone className="size-3.5 shrink-0" />
                      {store.storePhone}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("menu.storePhoneMissing")}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenMenu();
                    router.push(`/menu/stores/${store.storeId}`);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-teal-500 to-emerald-500 py-3 text-sm font-medium text-white shadow-md shadow-teal-500/20 transition active:scale-95"
                >
                  <ShoppingBag className="size-4" />
                  {t("menu.viewStoreMenu")}
                </button>
                <m.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggle(savedStoreFromStory(store))}
                  aria-label={saved ? t("menu.unsaveStore") : t("menu.saveStore")}
                  className={cn(
                    "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl transition",
                    saved
                      ? "bg-teal-500 text-white shadow-md shadow-teal-500/35 ring-2 ring-teal-300/60"
                      : "bg-background/80 text-muted-foreground ring-1 ring-border hover:text-teal-600",
                  )}
                >
                  <Bookmark className={cn("size-5", saved && "fill-current")} />
                </m.button>
              </div>
            </div>
          </m.section>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
