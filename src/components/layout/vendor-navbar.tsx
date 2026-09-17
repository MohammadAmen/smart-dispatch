"use client";

import { AnimatePresence, m } from "framer-motion";
import { Bell, ChevronDown, Headset, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { logoutRequest } from "@/lib/auth/client";
import { toggleVendorStoreActiveAction } from "@/lib/stores/vendor-settings-actions";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { useVendorOrdersStore } from "@/stores/vendor-orders-store";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "S";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

function LanguageCapsule(): ReactNode {
  const { locale, setLocale } = useLocale();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/60 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-800/60"
      aria-label="AR / EN"
    >
      <span className={cn(locale === "ar" ? "text-foreground" : "text-muted-foreground")}>AR</span>
      <span className="text-muted-foreground">/</span>
      <span className={cn(locale === "en" ? "text-foreground" : "text-muted-foreground")}>EN</span>
    </button>
  );
}

export function VendorNavbar({
  storeId,
  storeActive,
  storePhone,
}: {
  storeId: string | null;
  storeActive: boolean;
  storePhone: string | null;
}): ReactNode {
  const { t, locale } = useLocale();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const pendingCount = useVendorOrdersStore((state) => state.pendingCount);
  const activeCount = useVendorOrdersStore((state) => state.activeCount);
  const [accepting, setAccepting] = useState(storeActive);
  const [menuOpen, setMenuOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccepting(storeActive);
  }, [storeActive]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointer = (event: MouseEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  const toggleAccepting = (): void => {
    if (!storeId) {
      return;
    }
    const next = !accepting;
    setAccepting(next);
    const formData = new FormData();
    formData.set("storeId", storeId);
    formData.set("active", next ? "1" : "0");
    startTransition(async () => {
      const result = await toggleVendorStoreActiveAction(formData);
      if (!result.ok) {
        setAccepting(!next);
      }
    });
  };

  const onLogout = async (): Promise<void> => {
    await logoutRequest();
    useSessionStore.getState().setUser(null);
    router.replace(`/${locale}/login`);
    router.refresh();
  };

  const displayName = user?.name ?? t("navbar.userName");
  const supportHref = storePhone
    ? `https://wa.me/${storePhone.replace(/[^\d]/g, "")}`
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/80">
      <div className="flex h-14 items-center gap-2 px-4 md:px-6">
        {storeId ? (
          <button
            type="button"
            onClick={toggleAccepting}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              accepting
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/25 bg-destructive/10 text-destructive",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                accepting ? "bg-emerald-500 shadow-[0_0_8px_oklch(0.72_0.19_155)]" : "bg-destructive",
              )}
            />
            <span className="hidden sm:inline">
              {accepting ? t("vendor.navBar.accepting") : t("vendor.navBar.paused")}
            </span>
            <span className="sm:hidden">{accepting ? "🟢" : "🔴"}</span>
          </button>
        ) : null}

        <Link
          href="/vendor/orders"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-800/60"
        >
          <span className="tabular-nums">{t("vendor.navBar.activeOrders", { count: activeCount })}</span>
        </Link>

        <div className="ms-auto flex items-center gap-2">
          <LanguageCapsule />

          <Link
            href="/vendor/orders"
            className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
            aria-label={t("aria.notifications")}
          >
            <Bell className="size-4" />
            {pendingCount > 0 ? (
              <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-destructive shadow-[0_0_8px_oklch(0.63_0.22_25/0.7)]" />
            ) : null}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-full py-0.5 ps-0.5 pe-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-info text-xs font-semibold text-primary-foreground">
                {initials(displayName)}
              </span>
              <span className="hidden max-w-[9rem] truncate text-xs font-medium sm:inline">
                {displayName}
              </span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
            </button>

            <AnimatePresence>
              {menuOpen ? (
                <m.div
                  role="menu"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute end-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 p-1.5 shadow-lg backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/95"
                >
                  <Link
                    href="/vendor/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Settings className="size-4 text-current" />
                    {t("vendor.navBar.settings")}
                  </Link>
                  {supportHref ? (
                    <a
                      href={supportHref}
                      target="_blank"
                      rel="noreferrer"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Headset className="size-4 text-current" />
                      {t("vendor.navBar.support")}
                    </a>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setSupportOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Headset className="size-4 text-current" />
                      {t("vendor.navBar.support")}
                    </button>
                  )}
                  <div className="my-1 border-t border-slate-200/70 dark:border-slate-700/70" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void onLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="size-4 text-current" />
                    {t("vendor.navBar.logout")}
                  </button>
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {supportOpen ? (
          <m.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-background/55 backdrop-blur-sm"
              aria-label={t("common.close")}
              onClick={() => setSupportOpen(false)}
            />
            <m.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <h2 className="font-heading text-base font-semibold">{t("vendor.navBar.supportTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("vendor.navBar.supportBody")}</p>
              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="mt-4 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                {t("common.close")}
              </button>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
