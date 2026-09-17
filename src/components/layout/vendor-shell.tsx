"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Armchair,
  Clapperboard,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Package,
  QrCode,
  Search,
  Settings,
  Store,
  Tags,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { VendorNavbar } from "@/components/layout/vendor-navbar";
import { SessionSync } from "@/components/auth/session-sync";
import { AudioUnlock } from "@/components/providers/audio-unlock";
import { MotionProvider } from "@/components/providers/motion-provider";
import { VendorOfferAlerts } from "@/components/stores/vendor-offer-alerts";
import { VendorOrderAlerts } from "@/components/stores/vendor-order-alerts";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { useLocale } from "@/components/providers/locale-provider";
import { storeUsesDineInTables } from "@/lib/stores/indoor-service";
import { stripLocalePrefix } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { useVendorOrdersStore } from "@/stores/vendor-orders-store";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  badge?: "orders";
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

function vendorNavGroups(usesTables: boolean): NavGroup[] {
  return [
    {
      labelKey: "vendor.nav.analytics",
      items: [
        { href: "/vendor/dashboard", labelKey: "vendor.overview", icon: LayoutDashboard },
        { href: "/vendor/reports", labelKey: "vendor.reports", icon: TrendingUp },
        { href: "/vendor/insights", labelKey: "vendor.insights", icon: Search },
      ],
    },
    {
      labelKey: "vendor.nav.sales",
      items: [
        { href: "/vendor/orders", labelKey: "vendor.orders", icon: ClipboardList, badge: "orders" },
        { href: "/vendor/offers", labelKey: "vendor.offers", icon: Megaphone },
        { href: "/vendor/stories", labelKey: "vendor.stories", icon: Clapperboard },
      ],
    },
    {
      labelKey: "vendor.nav.catalog",
      items: [
        { href: "/vendor/products", labelKey: "vendor.products", icon: Package },
        { href: "/vendor/categories", labelKey: "vendor.categories", icon: Tags },
      ],
    },
    {
      labelKey: "vendor.nav.indoor",
      items: [
        {
          href: "/vendor/tables",
          labelKey: usesTables ? "vendor.tables" : "vendor.storeQr",
          icon: usesTables ? Armchair : QrCode,
        },
      ],
    },
    {
      labelKey: "vendor.nav.store",
      items: [{ href: "/vendor/settings", labelKey: "vendor.settings", icon: Settings }],
    },
  ];
}

function isActiveHref(pathname: string, href: string): boolean {
  const current = stripLocalePrefix(pathname);
  return current === href || current.startsWith(`${href}/`);
}

function VendorNavLink({
  item,
  pendingCount,
  compact,
}: {
  item: NavItem;
  pendingCount: number;
  compact?: boolean;
}): ReactNode {
  const pathname = usePathname();
  const { t } = useLocale();
  const Icon = item.icon;
  const active = isActiveHref(pathname, item.href);
  const showBadge = item.badge === "orders" && pendingCount > 0;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        compact && "shrink-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
      <span className="min-w-0 flex-1">{t(item.labelKey)}</span>
      {showBadge ? (
        <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
          {pendingCount}
        </span>
      ) : null}
    </Link>
  );
}

function VendorNav({
  usesTables,
  compact,
  className,
}: {
  usesTables: boolean;
  compact?: boolean;
  className?: string;
}): ReactNode {
  const { t } = useLocale();
  const pendingCount = useVendorOrdersStore((state) => state.pendingCount);
  const groups = vendorNavGroups(usesTables);

  if (compact) {
    return (
      <nav className={cn("flex gap-4 overflow-x-auto pb-1", className)} aria-label={t("aria.sidebar")}>
        {groups.map((group) => (
          <div key={group.labelKey} className="flex shrink-0 flex-col gap-1">
            <p className="px-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {t(group.labelKey)}
            </p>
            <div className="flex gap-1">
              {group.items.map((item) => (
                <VendorNavLink key={item.href} item={item} pendingCount={pendingCount} compact />
              ))}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn("flex flex-col gap-5", className)} aria-label={t("aria.sidebar")}>
      {groups.map((group) => (
        <div key={group.labelKey} className="space-y-1">
          <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {t(group.labelKey)}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => (
              <VendorNavLink key={item.href} item={item} pendingCount={pendingCount} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function VendorShell({
  children,
  storeId,
  storeType,
  storeActive = false,
  storePhone = null,
}: {
  children: ReactNode;
  storeId: string | null;
  storeType: { icon: string; name: string } | null;
  storeActive?: boolean;
  storePhone?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const usesTables = storeType ? storeUsesDineInTables(storeType) : false;

  return (
    <MotionProvider>
      <SessionSync />
      <AudioUnlock />
      <div className="print:hidden">
        <VendorOrderAlerts storeId={storeId} />
        <VendorOfferAlerts storeId={storeId} />
        <ToastViewport />
      </div>
      <div className="ambient-mesh min-h-dvh">
        <div className="flex min-h-dvh">
          <aside className="glass-strong sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-e p-4 print:hidden md:flex">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Store className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t("brand.name")}</p>
                <p className="text-xs text-muted-foreground">{t("nav.vendor")}</p>
              </div>
            </div>
            <VendorNav usesTables={usesTables} />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="print:hidden">
              <VendorNavbar storeId={storeId} storeActive={storeActive} storePhone={storePhone} />
            </div>
            <div className="border-b border-border/60 px-4 py-2 print:hidden md:hidden">
              <VendorNav usesTables={usesTables} compact />
            </div>
            <main className="flex-1 px-4 py-5 md:px-6 md:py-6 print:p-0">{children}</main>
          </div>
        </div>
      </div>
    </MotionProvider>
  );
}
