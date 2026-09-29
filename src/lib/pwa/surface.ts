import { stripLocalePrefix } from "@/lib/paths";

export const PATHNAME_HEADER = "x-pathname";

export type PwaSurface = "menu" | "vendor" | "app";

export function pwaSurfaceFromPath(pathname: string): PwaSurface {
  const path = stripLocalePrefix(pathname);
  if (path === "/menu" || path.startsWith("/menu/")) {
    return "menu";
  }
  if (path === "/vendor" || path.startsWith("/vendor/")) {
    return "vendor";
  }
  return "app";
}

export function manifestForSurface(surface: PwaSurface): string {
  if (surface === "menu") {
    return "/menu.webmanifest";
  }
  if (surface === "vendor") {
    return "/vendor.webmanifest";
  }
  return "/manifest.json";
}

export function isVendorLoginPath(pathname: string): boolean {
  return stripLocalePrefix(pathname) === "/vendor/login";
}
