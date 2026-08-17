import { MAP_CENTER, type LatLngTuple } from "@/lib/live-map";

function readCoord(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getDepotPoint(): LatLngTuple {
  return [
    readCoord(process.env.DISPATCH_DEPOT_LAT, MAP_CENTER[0]),
    readCoord(process.env.DISPATCH_DEPOT_LNG, MAP_CENTER[1]),
  ];
}
