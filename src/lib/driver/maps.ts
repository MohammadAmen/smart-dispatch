import type { LatLngTuple } from "@/lib/live-map";

export function googleMapsDirectionsHref(point: LatLngTuple): string {
  const [latitude, longitude] = point;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
}

export function assignmentNavPoint(input: {
  pickup: LatLngTuple | null;
  destination: LatLngTuple;
  status: "ASSIGNED" | "IN_TRANSIT";
}): LatLngTuple {
  if (input.status === "ASSIGNED" && input.pickup) {
    return input.pickup;
  }
  return input.destination;
}
