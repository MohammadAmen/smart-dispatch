import type { LocalizedText } from "@/lib/localized";

export type LatLngTuple = [number, number];

export const DISPATCH_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELED",
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export type DispatchFilter = "ALL" | Exclude<DispatchStatus, "CANCELED">;

export type MapLayout = "overlay" | "split";

export type MapMarkerKind = "queued" | "in-transit" | "delayed" | "delivered";

export interface LiveOrder {
  id: string;
  vehicleId: string;
  driverName: string;
  destination: LocalizedText;
  eta: string;
  status: DispatchStatus;
  delayed: boolean;
  driver: LatLngTuple;
  destinationPoint: LatLngTuple;
  progress: number;
  customerPhone: string;
  weight: string;
}

export interface CourierPoolItem {
  vehicleId: string;
  driverName: string;
  driver: LatLngTuple;
}

export const MAP_CENTER: LatLngTuple = [31.9539, 35.9106];

export const MAP_BOUNDS_PADDING: [number, number] = [72, 72];

export const courierPool: CourierPoolItem[] = [
  { vehicleId: "VAN-19", driverName: "Yusef T.", driver: [31.9788, 35.9412] },
  { vehicleId: "VAN-03", driverName: "Lina R.", driver: [31.9736, 35.9108] },
  { vehicleId: "VAN-05", driverName: "Sami D.", driver: [31.9602, 35.9054] },
  { vehicleId: "VAN-14", driverName: "Hala M.", driver: [31.9841, 35.8688] },
];

export const liveOrders: LiveOrder[] = [
  {
    id: "SD-10482",
    vehicleId: "VAN-07",
    driverName: "Amina K.",
    destination: { ar: "مركز الميناء الغربي", en: "West Harbor Hub" },
    eta: "14:20",
    status: "IN_TRANSIT",
    delayed: false,
    driver: [31.9684, 35.8912],
    destinationPoint: [31.9518, 35.8624],
    progress: 0.42,
    customerPhone: "+962 79 441 0282",
    weight: "42 kg",
  },
  {
    id: "SD-10479",
    vehicleId: "VAN-12",
    driverName: "Omar S.",
    destination: { ar: "عيادة التلال الشمالية", en: "North Ridge Clinic" },
    eta: "14:45",
    status: "IN_TRANSIT",
    delayed: true,
    driver: [32.0041, 35.877],
    destinationPoint: [32.0312, 35.8588],
    progress: 0.28,
    customerPhone: "+962 78 330 1479",
    weight: "18 kg",
  },
  {
    id: "SD-10461",
    vehicleId: "VAN-21",
    driverName: "Noor H.",
    destination: { ar: "شحن المطار أ2", en: "Airport Cargo A2" },
    eta: "15:40",
    status: "IN_TRANSIT",
    delayed: false,
    driver: [31.8014, 35.9726],
    destinationPoint: [31.7225, 35.9932],
    progress: 0.61,
    customerPhone: "+962 79 512 0461",
    weight: "33 kg",
  },
  {
    id: "SD-10488",
    vehicleId: "VAN-19",
    driverName: "Yusef T.",
    destination: { ar: "مجمّع الشرق اللوجستي", en: "East Logistics Park" },
    eta: "15:55",
    status: "ASSIGNED",
    delayed: false,
    driver: [31.9788, 35.9412],
    destinationPoint: [31.9894, 35.9516],
    progress: 0.04,
    customerPhone: "+962 77 221 0488",
    weight: "24 kg",
  },
  {
    id: "SD-10475",
    vehicleId: "—",
    driverName: "—",
    destination: { ar: "سوق المدينة ط3", en: "City Market L3" },
    eta: "15:10",
    status: "PENDING",
    delayed: false,
    driver: [31.9736, 35.9108],
    destinationPoint: [31.9452, 35.9284],
    progress: 0,
    customerPhone: "+962 79 880 0475",
    weight: "27 kg",
  },
  {
    id: "SD-10491",
    vehicleId: "—",
    driverName: "—",
    destination: { ar: "مركز الميناء الغربي", en: "West Harbor Hub" },
    eta: "16:05",
    status: "PENDING",
    delayed: false,
    driver: [31.9602, 35.9054],
    destinationPoint: [31.9531, 35.8598],
    progress: 0,
    customerPhone: "+962 78 194 0491",
    weight: "15 kg",
  },
  {
    id: "SD-10468",
    vehicleId: "VAN-11",
    driverName: "Yusef T.",
    destination: { ar: "مجمّع الشرق اللوجستي", en: "East Logistics Park" },
    eta: "—",
    status: "DELIVERED",
    delayed: false,
    driver: [31.9894, 35.9516],
    destinationPoint: [31.9894, 35.9516],
    progress: 1,
    customerPhone: "+962 79 640 0468",
    weight: "61 kg",
  },
];

export function markerKind(order: LiveOrder): MapMarkerKind {
  if (order.status === "DELIVERED") {
    return "delivered";
  }

  if (order.delayed) {
    return "delayed";
  }

  if (order.status === "IN_TRANSIT") {
    return "in-transit";
  }

  return "queued";
}

export function isActiveOnMap(order: LiveOrder): boolean {
  return order.status !== "CANCELED";
}

export function quadraticCurve(
  start: LatLngTuple,
  end: LatLngTuple,
  samples = 28,
): LatLngTuple[] {
  const lngDelta = end[1] - start[1];
  const latDelta = end[0] - start[0];
  const control: LatLngTuple = [
    (start[0] + end[0]) / 2 + lngDelta * 0.18,
    (start[1] + end[1]) / 2 - latDelta * 0.18,
  ];

  const points: LatLngTuple[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const inverse = 1 - t;
    points.push([
      inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0],
      inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1],
    ]);
  }

  return points;
}

export function pointAlong(points: LatLngTuple[], progress: number): LatLngTuple {
  if (points.length === 0) {
    return MAP_CENTER;
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (points.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const current = points[index];
  const next = points[Math.min(index + 1, points.length - 1)];

  return [
    current[0] + (next[0] - current[0]) * fraction,
    current[1] + (next[1] - current[1]) * fraction,
  ];
}

export function routeBounds(driver: LatLngTuple, destination: LatLngTuple): LatLngTuple[] {
  return [driver, destination];
}

export function formatCoord(value: number): string {
  return value.toFixed(4);
}
