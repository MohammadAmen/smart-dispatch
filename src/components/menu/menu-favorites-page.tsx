"use client";

import { Heart, Store, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { useLocale } from "@/components/providers/locale-provider";
import { useSavedStoresStore } from "@/stores/saved-stores-store";

export function MenuFavoritesPage(): ReactNode {
  const { t } = useLocale();
  const hydrate = useSavedStoresStore((state) => state.hydrate);
  const stores = useSavedStoresStore((state) => state.stores);
  const remove = useSavedStoresStore((state) => state.remove);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-[#FFFDF9] dark:bg-background">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 pb-4 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center gap-3">
          <BrandMark size={48} rounded={false} className="size-12 rounded-2xl border-0 shadow-none" />
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-50">
              {t("menu.navFavorites")}
            </h1>
            <p className="text-xs text-slate-500">{t("menu.savedStoresHint")}</p>
          </div>
        </div>
      </header>

      <main className="space-y-3 px-4 py-5">
        {stores.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <Heart className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">{t("menu.emptySavedStores")}</p>
            <Link
              href="/menu"
              className="mt-4 inline-flex rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-slate-900"
            >
              {t("menu.navHome")}
            </Link>
          </div>
        ) : (
          stores.map((store) => (
            <article
              key={store.id}
              className="flex items-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <Link
                href={`/menu/stores/${store.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                  {store.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Store className="size-5 text-amber-600" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {store.name}
                  </span>
                  {store.city || store.address ? (
                    <span className="block truncate text-xs text-slate-500">
                      {store.city || store.address}
                    </span>
                  ) : null}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(store.id)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700"
                aria-label={t("menu.unsaveStore")}
              >
                <Trash2 className="size-4" />
              </button>
            </article>
          ))
        )}
      </main>
    </div>
  );
}
