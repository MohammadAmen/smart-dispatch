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
  { href: "/fleet", labelKey: "nav.fleet", icon: Truck, roles: ["ADMIN", "DISPATCHER"] },
  { href: "/routes", labelKey: "nav.routes", icon: Route },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3, roles: ["ADMIN", "DISPATCHER"] },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings/users", labelKey: "nav.users", icon: Users, roles: ["ADMIN", "DISPATCHER"] },
  { href: "/settings/zones", labelKey: "nav.zones", icon: MapPinned, roles: ["ADMIN", "DISPATCHER"] },
  { href: "/settings/vehicle-types", labelKey: "nav.vehicleTypes", icon: Car, roles: ["ADMIN", "DISPATCHER"] },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];
