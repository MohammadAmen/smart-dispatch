"use client";

import { AnimatePresence, m } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Truck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { primaryNav, secondaryNav, type NavItem } from "@/lib/nav";
import type { SessionRole } from "@/lib/auth/constants";
import { stripLocalePrefix } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { useUiStore } from "@/stores/ui-store";

const EXPANDED_WIDTH = 268;
const COLLAPSED_WIDTH = 76;
const MOBILE_SLIDE = 280;

function visibleNav(items: NavItem[], role: SessionRole | null, loaded: boolean): NavItem[] {
  return items.filter((item) => {
    if (!item.roles) {
      return true;
    }

    if (!loaded || !role) {
      return true;
    }

    return item.roles.includes(role);
  });
}

function isActivePath(pathname: string, href: string): boolean {
  const current = stripLocalePrefix(pathname);

  if (href === "/") {
    return current === "/";
  }

  if (href === "/settings") {
    return current === "/settings";
  }

  return current === href || current.startsWith(`${href}/`);
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate: () => void;
}): ReactNode {
  const pathname = usePathname();
  const { t } = useLocale();
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;
  const label = t(item.labelKey);

  return (
    <Link
      href={item.href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
      )}
    >
      {active ? (
        <span className="absolute start-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      ) : null}
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
          active ? "text-primary" : "text-current",
        )}
      />
      <AnimatePresence initial={false}>
        {collapsed ? null : (
          <m.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18 }}
            className="truncate"
          >
            {label}
          </m.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function SidebarBody({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: () => void;
}): ReactNode {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const { t } = useLocale();
  const role = useSessionStore((state) => state.user?.role ?? null);
  const loaded = useSessionStore((state) => state.loaded);
  const operations = visibleNav(primaryNav, role, loaded);
  const workspace = visibleNav(secondaryNav, role, loaded);

  return (
    <>
      <div
        className={cn(
          "flex h-16 items-center gap-3 px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_oklch(0.55_0.12_195)]">
          <Truck className="size-[18px]" />
        </span>
        <AnimatePresence initial={false}>
          {collapsed ? null : (
            <m.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="min-w-0"
            >
              <p className="truncate text-sm font-semibold tracking-tight">
                {t("brand.name")}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {t("brand.tagline")}
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex flex-1 flex-col gap-6 px-3 py-2" aria-label={t("aria.mainNav")}>
        <div className="space-y-1">
          {collapsed ? null : (
            <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {t("nav.operations")}
            </p>
          )}
          {operations.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
        <div className="mt-auto space-y-1">
          {collapsed ? null : (
            <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {t("nav.workspace")}
            </p>
          )}
          {workspace.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className={cn("p-3", collapsed && "flex justify-center")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onPress={toggleSidebar}
          aria-label={
            collapsed ? t("aria.expandSidebar") : t("aria.collapseSidebar")
          }
          className={cn("hidden w-full md:inline-flex", collapsed && "w-auto")}
        >
          {collapsed ? (
            <PanelLeftOpen className="rtl:-scale-x-100" />
          ) : (
            <>
              <PanelLeftClose
                data-icon="inline-start"
                className="rtl:-scale-x-100"
              />
              {t("common.collapse")}
            </>
          )}
        </Button>
      </div>
    </>
  );
}

export function Sidebar(): ReactNode {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const { dir, t } = useLocale();
  const slideFrom = dir === "rtl" ? MOBILE_SLIDE : -MOBILE_SLIDE;

  const closeMobile = useCallback(() => {
    setMobileNavOpen(false);
  }, [setMobileNavOpen]);

  return (
    <>
      <m.aside
        aria-label={t("aria.sidebar")}
        initial={false}
        animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        className="glass-strong sticky top-0 hidden h-dvh shrink-0 flex-col border-e md:flex"
      >
        <SidebarBody collapsed={collapsed} onNavigate={() => undefined} />
      </m.aside>

      <AnimatePresence>
        {mobileNavOpen ? (
          <>
            <m.button
              type="button"
              aria-label={t("aria.closeNav")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm md:hidden"
              onClick={closeMobile}
            />
            <m.aside
              initial={{ x: slideFrom }}
              animate={{ x: 0 }}
              exit={{ x: slideFrom }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="glass-strong fixed inset-y-0 start-0 z-50 flex w-[min(86vw,268px)] flex-col border-e md:hidden"
            >
              <button
                type="button"
                onClick={closeMobile}
                className="absolute top-4 end-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={t("aria.closeNav")}
              >
                <X className="size-4" />
              </button>
              <SidebarBody collapsed={false} onNavigate={closeMobile} />
            </m.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
