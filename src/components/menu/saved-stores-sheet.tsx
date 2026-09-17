"use client";

import { AnimatePresence, m } from "framer-motion";
import { BookmarkX, ShoppingBag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { useSavedStoresStore } from "@/stores/saved-stores-store";

export function SavedStoresSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const hydrate = useSavedStoresStore((state) => state.hydrate);
  const stores = useSavedStoresStore((state) => state.stores);
  const remove = useSavedStoresStore((state) => state.remove);

  useEffect(() => {
    if (open) {
      hydrate();
    }
  }, [hydrate, open]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/55 backdrop-blur-sm"
            aria-label={t("common.close")}
            onClick={onClose}
          />
          <m.section
            role="dialog"
            aria-modal="true"
            initial={{ y: 48 }}
            animate={{ y: 0 }}
            exit={{ y: 56 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 max-h-[82dvh] w-full max-w-lg overflow-hidden rounded-t-3xl border-x border-t"
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border" />
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">{t("menu.savedStores")}</h2>
                <p className="text-xs text-muted-foreground">{t("menu.savedStoresHint")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-8 items-center justify-center rounded-full bg-background/70"
                aria-label={t("common.close")}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto px-5 pb-6">
              {stores.length === 0 ? (
                <p className="rounded-2xl bg-background/50 px-4 py-10 text-center text-sm text-muted-foreground">
                  {t("menu.emptySavedStores")}
                </p>
              ) : (
                stores.map((store) => (
                  <article
                    key={store.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/55 p-3"
                  >
                    <span className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      {store.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={store.logoUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-sm font-semibold">
                          {store.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{store.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {store.address || store.city || t("menu.distanceUnknown")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(`/menu/stores/${store.id}`);
                      }}
                      className="inline-flex size-9 items-center justify-center rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300"
                      aria-label={t("menu.viewStoreMenu")}
                    >
                      <ShoppingBag className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(store.id)}
                      className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      aria-label={t("menu.unsaveStore")}
                    >
                      <BookmarkX className="size-4" />
                    </button>
                  </article>
                ))
              )}
            </div>
          </m.section>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
