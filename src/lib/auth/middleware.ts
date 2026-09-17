import {
  homePathForRole,
  isDispatchRole,
  isSuperAdminRole,
  type SessionRole,
} from "@/lib/auth/constants";
import { stripLocalePrefix } from "@/lib/paths";

export type AccessDecision =
  | { action: "allow" }
  | { action: "login"; next: string }
  | { action: "redirect"; to: string };

const PUBLIC_EXACT = new Set(["/login", "/menu"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname) || pathname.startsWith("/menu/")) {
    return true;
  }

  if (pathname.startsWith("/api/auth/")) {
    return true;
  }

  if (pathname.startsWith("/api/menu/")) {
    return true;
  }

  if (pathname === "/api/orders/create") {
    return true;
  }

  if (pathname.startsWith("/api/stories")) {
    return true;
  }

  if (pathname.startsWith("/api/uploads")) {
    return true;
  }

  if (pathname === "/api/cron/scheduled-dispatch") {
    return true;
  }

  if (pathname.startsWith("/api/webhooks/")) {
    return true;
  }

  return false;
}

function isDriverAppPath(pathname: string): boolean {
  return pathname === "/driver" || pathname.startsWith("/driver/");
}

function isVendorPath(pathname: string): boolean {
  return pathname === "/vendor" || pathname.startsWith("/vendor/");
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isStaffRestrictedPath(pathname: string): boolean {
  return (
    pathname === "/fleet" ||
    pathname.startsWith("/fleet/") ||
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname === "/settings/users" ||
    pathname.startsWith("/settings/users/") ||
    pathname === "/settings/zones" ||
    pathname.startsWith("/settings/zones/") ||
    pathname === "/settings/vehicle-types" ||
    pathname.startsWith("/settings/vehicle-types/") ||
    pathname === "/analytics" ||
    pathname.startsWith("/analytics/") ||
    pathname === "/dashboard/analytics" ||
    pathname.startsWith("/dashboard/analytics/")
  );
}

function isStaffAppPath(pathname: string): boolean {
  if (
    isDriverAppPath(pathname) ||
    isPublicPath(pathname) ||
    isVendorPath(pathname) ||
    isAdminPath(pathname)
  ) {
    return false;
  }

  if (pathname.startsWith("/api/")) {
    return false;
  }

  return true;
}

export function decideAccess(
  rawPathname: string,
  role: SessionRole | null,
): AccessDecision {
  const pathname = stripLocalePrefix(rawPathname);
  const localeMatch = rawPathname.match(/^\/(ar|en)(?=\/|$)/);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : "";

  if (isPublicPath(pathname)) {
    if (role && pathname === "/login") {
      return {
        action: "redirect",
        to: homePathForRole(role, localePrefix.replace("/", "")),
      };
    }

    return { action: "allow" };
  }

  if (!role) {
    const next = encodeURIComponent(rawPathname || "/");
    return { action: "login", next };
  }

  if (isVendorPath(pathname)) {
    if (role === "STORE_OWNER" || isSuperAdminRole(role)) {
      return { action: "allow" };
    }

    return { action: "redirect", to: homePathForRole(role, localePrefix.replace("/", "")) };
  }

  if (isAdminPath(pathname)) {
    if (isSuperAdminRole(role)) {
      return { action: "allow" };
    }

    return { action: "redirect", to: homePathForRole(role, localePrefix.replace("/", "")) };
  }

  if (isDriverAppPath(pathname)) {
    if (role === "DRIVER" || isSuperAdminRole(role)) {
      return { action: "allow" };
    }

    return { action: "redirect", to: homePathForRole(role, localePrefix.replace("/", "")) };
  }

  if (isStaffRestrictedPath(pathname)) {
    if (isDispatchRole(role)) {
      return { action: "allow" };
    }

    return { action: "redirect", to: homePathForRole(role, localePrefix.replace("/", "")) };
  }

  if (pathname.startsWith("/api/driver")) {
    if (role === "DRIVER" || isSuperAdminRole(role)) {
      return { action: "allow" };
    }

    return { action: "redirect", to: homePathForRole(role, localePrefix.replace("/", "")) };
  }

  if (
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/fleet") ||
    pathname.startsWith("/api/routes") ||
    pathname.startsWith("/api/analytics") ||
    pathname.startsWith("/api/zones") ||
    pathname.startsWith("/api/vehicle-types") ||
    pathname.startsWith("/api/catalog")
  ) {
    if (isDispatchRole(role)) {
      return { action: "allow" };
    }

    return { action: "redirect", to: homePathForRole(role, localePrefix.replace("/", "")) };
  }

  if (role === "STORE_OWNER") {
    return { action: "redirect", to: homePathForRole(role, localePrefix.replace("/", "")) };
  }

  if (role === "CUSTOMER") {
    return { action: "redirect", to: `${localePrefix}/menu` };
  }

  if (isStaffAppPath(pathname) && role === "DRIVER") {
    return { action: "redirect", to: `${localePrefix}/driver` };
  }

  return { action: "allow" };
}
