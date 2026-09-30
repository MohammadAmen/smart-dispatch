"use client";

import { ClipboardList, Heart, Home, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { MENU_CHECKOUT_STATE_EVENT, requestMenuCartOpen } from "@/lib/menu/chrome-events";
import { MENU_CART_KEY } from "@/lib/stores/menu-cart";
import { readTrackingTokens } from "@/lib/stores/menu-track-store";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/stores/menu-cart-store";
import { useSavedStoresStore } from "@/stores/saved-stores-store";

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/menu") {
    return pathname === "/menu" || pathname === "/menu/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MenuBottomNav(): ReactNode {
  const { t } = useLocale();
  const pathname = usePathname() ?? "/menu";
  const searchParams = useSearchParams();
  const hydrateCart = useMenuCartStore((state) => state.hydrate);
  const cartCount = useMenuCartStore((state) =>
    state.lines.reduce((sum, line) => sum + line.quantity, 0),
  );
  const hydrateSaved = useSavedStoresStore((state) => state.hydrate);
  const savedCount = useSavedStoresStore((state) => state.stores.length);
  const [ordersCount, setOrdersCount] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const dineIn = Boolean(searchParams?.get("table") || searchParams?.get("tableId"));

  useEffect(() => {
    hydrateCart();
    hydrateSaved();
    setOrdersCount(readTrackingTokens().length);
    const onStorage = (event: StorageEvent): void => {
      if (event.key === MENU_CART_KEY) {
        hydrateCart();
      }
      setOrdersCount(readTrackingTokens().length);
    };
    const onCheckout = (event: Event): void => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setCheckoutOpen(Boolean(detail?.open));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MENU_CHECKOUT_STATE_EVENT, onCheckout);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MENU_CHECKOUT_STATE_EVENT, onCheckout);
    };
  }, [hydrateCart, hydrateSaved]);

  if (dineIn || checkoutOpen) {
    return null;
  }

  const items = [
    {
      key: "account",
      href: "/menu/account" as string | null,
      label: t("menu.navAccount"),
      icon: UserRound,
      badge: 0,
      center: false,
    },
    {
      key: "favorites",
      href: "/menu/favorites" as string | null,
      label: t("menu.navFavorites"),
      icon: Heart,
      badge: savedCount,
      center: false,
    },
    {
      key: "home",
      href: "/menu" as string | null,
      label: t("menu.navHome"),
      icon: Home,
      badge: 0,
      center: true,
    },
    {
      key: "orders",
      href: "/menu/orders" as string | null,
      label: t("menu.navOrders"),
      icon: ClipboardList,
      badge: ordersCount,
      center: false,
    },
    {
      key: "cart",
      href: null as string | null,
      label: t("menu.navCart"),
      icon: ShoppingBag,
      badge: cartCount,
      center: false,
    },
  ];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[46] mx-auto w-full max-w-lg"
      aria-label={t("menu.navLabel")}
    >
      <div className="pointer-events-auto border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <ul className="grid grid-cols-5 items-end gap-0.5">
          {items.map((item) => {
            const active = item.href ? isActivePath(pathname, item.href) : false;
            const Icon = item.icon;
            const homeGlow = item.center;

            const inner = (
              <>
                <span
                  className={cn(
                    "relative inline-flex items-center justify-center transition-all",
                    homeGlow
                      ? "size-12 -mt-5 rounded-full bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/35"
                      : cn(
                          "size-9 rounded-2xl",
                          active
                            ? "bg-amber-400/15 text-amber-700 dark:text-amber-300"
                            : "text-slate-500 dark:text-slate-400",
                        ),
                  )}
                >
                  <Icon
                    className={cn(
                      homeGlow ? "size-5" : "size-[1.15rem]",
                      item.key === "favorites" && active && "fill-current",
                    )}
                  />
                  {item.badge > 0 ? (
                    <span className="absolute -top-1 -end-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-0.5 max-w-full truncate text-[10px] font-semibold leading-tight",
                    active || homeGlow
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {item.label}
                </span>
              </>
            );

            if (!item.href) {
              return (
                <li key={item.key} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => requestMenuCartOpen()}
                    className="flex w-full flex-col items-center gap-0.5 px-1 py-1"
                  >
                    {inner}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.key} className="flex justify-center">
                <Link
                  href={item.href}
                  className="flex w-full flex-col items-center gap-0.5 px-1 py-1"
                  aria-current={active ? "page" : undefined}
                >
                  {inner}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
