import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Car,
  LayoutDashboard,
  MapPinned,
  Package,
  Radio,
  Route,
  Settings,
  Shapes,
  Sparkles,
  Store,
  Truck,
  Users,
} from "lucide-react";

import type { SessionRole } from "@/lib/auth/constants";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  roles?: SessionRole[];
}

export const primaryNav: NavItem[] = [
  { href: "/", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/dashboard", labelKey: "nav.dispatch", icon: Radio },
  { href: "/orders", labelKey: "nav.orders", icon: Package },
  { href: "/fleet", labelKey: "nav.fleet", icon: Truck, roles: ["SUPER_ADMIN", "ADMIN", "DISPATCHER"] },
  { href: "/routes", labelKey: "nav.routes", icon: Route, roles: ["SUPER_ADMIN", "ADMIN", "DISPATCHER"] },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN", "DISPATCHER"] },
];

export const secondaryNav: NavItem[] = [
  { href: "/admin/stores", labelKey: "nav.stores", icon: Store, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/store-types", labelKey: "nav.storeTypes", icon: Shapes, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/admin/stories", labelKey: "nav.adminStories", icon: Sparkles, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/settings/users", labelKey: "nav.users", icon: Users, roles: ["SUPER_ADMIN", "ADMIN", "DISPATCHER"] },
  { href: "/settings/zones", labelKey: "nav.zones", icon: MapPinned, roles: ["SUPER_ADMIN", "ADMIN", "DISPATCHER"] },
  { href: "/settings/vehicle-types", labelKey: "nav.vehicleTypes", icon: Car, roles: ["SUPER_ADMIN", "ADMIN", "DISPATCHER"] },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];
