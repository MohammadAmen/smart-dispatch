import { calculateDistance } from "@/lib/geo";

export const DELIVERY_BASE_FEE = 4000;
export const DELIVERY_PER_KM = 2000;
export const DELIVERY_EXTRA_STOP = 1500;

export interface DeliveryStop {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DeliveryQuote {
  orderedStops: DeliveryStop[];
  distanceKm: number;
  stopCount: number;
  fee: number;
}

function finitePoint(stop: DeliveryStop): { lat: number; lng: number } | null {
  if (
    stop.latitude == null ||
    stop.longitude == null ||
    !Number.isFinite(stop.latitude) ||
    !Number.isFinite(stop.longitude)
  ) {
    return null;
  }
  return { lat: stop.latitude, lng: stop.longitude };
}

export function planPickupRoute(
  stops: DeliveryStop[],
  customer: { latitude: number; longitude: number } | null,
): DeliveryQuote {
  const unique = new Map<string, DeliveryStop>();
  for (const stop of stops) {
    unique.set(stop.id, stop);
  }
  const list = [...unique.values()];
  if (list.length === 0) {
    return { orderedStops: [], distanceKm: 0, stopCount: 0, fee: 0 };
  }

  const remaining = [...list];
  const ordered: DeliveryStop[] = [];
  let distanceKm = 0;

  const seedIndex = customer
    ? remaining.reduce((best, stop, index) => {
        const point = finitePoint(stop);
        if (!point) {
          return best;
        }
        const hop = calculateDistance(customer.latitude, customer.longitude, point.lat, point.lng);
        const currentBest = finitePoint(remaining[best]);
        const currentHop = currentBest
          ? calculateDistance(customer.latitude, customer.longitude, currentBest.lat, currentBest.lng)
          : Number.POSITIVE_INFINITY;
        return hop < currentHop ? index : best;
      }, 0)
    : 0;

  ordered.push(remaining.splice(seedIndex, 1)[0]);
  let cursor = finitePoint(ordered[0]);

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const point = finitePoint(remaining[index]);
      if (!point || !cursor) {
        continue;
      }
      const hop = calculateDistance(cursor.lat, cursor.lng, point.lat, point.lng);
      if (hop < bestDistance) {
        bestDistance = hop;
        bestIndex = index;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    if (Number.isFinite(bestDistance) && bestDistance !== Number.POSITIVE_INFINITY) {
      distanceKm += bestDistance;
    }
    const point = finitePoint(next);
    if (point) {
      cursor = point;
    }
  }

  if (customer && cursor) {
    const lastLeg = calculateDistance(cursor.lat, cursor.lng, customer.latitude, customer.longitude);
    if (Number.isFinite(lastLeg)) {
      distanceKm += lastLeg;
    }
  }

  const extraStops = Math.max(0, ordered.length - 1);
  const fee = Math.round(
    DELIVERY_BASE_FEE + extraStops * DELIVERY_EXTRA_STOP + Math.max(0, distanceKm) * DELIVERY_PER_KM,
  );

  return {
    orderedStops: ordered,
    distanceKm: Math.round(distanceKm * 10) / 10,
    stopCount: ordered.length,
    fee: Number.isFinite(fee) ? Math.max(DELIVERY_BASE_FEE, fee) : DELIVERY_BASE_FEE * ordered.length,
  };
}
