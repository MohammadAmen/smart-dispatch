import { stripLocalePrefix } from "@/lib/paths";
import type { SessionRole } from "@/lib/auth/constants";

export type AccessDecision =
  | { action: "allow" }
  | { action: "login"; next: string }
  | { action: "redirect"; to: string };

const PUBLIC_EXACT = new Set(["/login"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }

  if (pathname.startsWith("/api/auth/")) {
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
  if (isDriverAppPath(pathname) || isPublicPath(pathname)) {
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
        to: role === "DRIVER" ? `${localePrefix}/driver` : `${localePrefix}/dashboard`,
      };
    }

    return { action: "allow" };
  }

  if (!role) {
    const next = encodeURIComponent(rawPathname || "/");
    return { action: "login", next };
  }

  if (isDriverAppPath(pathname)) {
    if (role === "DRIVER" || role === "ADMIN") {
      return { action: "allow" };
    }

    return { action: "redirect", to: `${localePrefix}/dashboard` };
  }

  if (isStaffRestrictedPath(pathname)) {
    if (role === "ADMIN" || role === "DISPATCHER") {
      return { action: "allow" };
    }

    return { action: "redirect", to: `${localePrefix}/driver` };
  }

  if (pathname.startsWith("/api/driver")) {
    if (role === "DRIVER" || role === "ADMIN") {
      return { action: "allow" };
    }

    return { action: "redirect", to: `${localePrefix}/dashboard` };
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
    if (role === "ADMIN" || role === "DISPATCHER") {
      return { action: "allow" };
    }

    return { action: "redirect", to: `${localePrefix}/driver` };
  }

  if (isStaffAppPath(pathname) && role === "DRIVER") {
    return { action: "redirect", to: `${localePrefix}/driver` };
  }

  return { action: "allow" };
}
