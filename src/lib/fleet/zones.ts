import type { LatLngTuple } from "@/lib/live-map";
import { MAP_CENTER } from "@/lib/live-map";

export const FLEET_ZONES = [
  "core",
  "north",
  "west",
  "east",
  "airport",
  "depot",
] as const;

export type FleetZone = (typeof FLEET_ZONES)[number];

export function isFleetZone(value: string): value is FleetZone {
  return (FLEET_ZONES as readonly string[]).includes(value);
}

export function zoneFromPoint(lat: number, lng: number): FleetZone {
  const [centerLat, centerLng] = MAP_CENTER;

  if (lat >= centerLat + 0.035) {
    return "north";
  }

  if (lat <= centerLat - 0.12) {
    return "airport";
  }

  if (lng <= centerLng - 0.03) {
    return "west";
  }

  if (lng >= centerLng + 0.03) {
    return "east";
  }

  if (lat <= centerLat - 0.04 && Math.abs(lng - centerLng) < 0.02) {
    return "depot";
  }

  return "core";
}

export function zoneFromTuple(point: LatLngTuple): FleetZone {
  return zoneFromPoint(point[0], point[1]);
}
