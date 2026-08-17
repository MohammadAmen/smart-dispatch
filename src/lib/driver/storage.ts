import type { LatLngTuple } from "@/lib/live-map";

export const DRIVER_ID_KEY = "sd-driver-id";
export const DRIVER_ACCEPTED_KEY = "sd-driver-accepted";
export const DRIVER_LOCATION_KEY = "sd-driver-location";

export function readDriverId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(DRIVER_ID_KEY);
}

export function writeDriverId(driverId: string): void {
  localStorage.setItem(DRIVER_ID_KEY, driverId);
}

export function clearDriverId(): void {
  localStorage.removeItem(DRIVER_ID_KEY);
}

export function readAcceptedOrderNumber(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(DRIVER_ACCEPTED_KEY);
}

export function writeAcceptedOrderNumber(orderNumber: string | null): void {
  if (orderNumber) {
    localStorage.setItem(DRIVER_ACCEPTED_KEY, orderNumber);
    return;
  }

  localStorage.removeItem(DRIVER_ACCEPTED_KEY);
}

export function readStoredLocation(): LatLngTuple | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(DRIVER_LOCATION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "number" &&
      typeof parsed[1] === "number"
    ) {
      return [parsed[0], parsed[1]];
    }
  } catch {
    return null;
  }

  return null;
}

export function writeStoredLocation(point: LatLngTuple): void {
  localStorage.setItem(DRIVER_LOCATION_KEY, JSON.stringify(point));
}

export function toTelHref(phone: string): string {
  const compact = phone.replace(/[^\d+]/g, "");
  return `tel:${compact.startsWith("+") ? compact : `+${compact}`}`;
}
