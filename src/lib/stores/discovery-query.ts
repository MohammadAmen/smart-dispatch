import type { DiscoveryFeed } from "@/lib/stores/discovery-types";

export const DISCOVERY_KEY_PREFIX = "/api/discovery";

export function discoveryKey(
  category: string,
  lat: number | null,
  lng: number | null,
): string {
  const cat = category.trim() || "ALL";
  const location =
    lat != null && lng != null ? `${lat.toFixed(3)},${lng.toFixed(3)}` : "none";
  return `${DISCOVERY_KEY_PREFIX}?category=${encodeURIComponent(cat)}&loc=${location}`;
}

export async function fetchDiscoveryFeed(
  category: string,
  lat: number | null,
  lng: number | null,
): Promise<DiscoveryFeed> {
  const params = new URLSearchParams({
    category: category.trim() || "ALL",
  });
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  const response = await fetch(`${DISCOVERY_KEY_PREFIX}?${params.toString()}`, {
    cache: "no-store",
  });
  const body = (await response.json()) as Partial<DiscoveryFeed> & { ok?: boolean };
  if (!body.ok) {
    throw new Error("Could not load discovery feed.");
  }

  return {
    trending: Array.isArray(body.trending) ? body.trending : [],
    deals: Array.isArray(body.deals) ? body.deals : [],
    newArrivals: Array.isArray(body.newArrivals) ? body.newArrivals : [],
    curated: Array.isArray(body.curated) ? body.curated : [],
  };
}
