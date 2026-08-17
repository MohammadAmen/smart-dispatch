import type { LocalizedText } from "@/lib/localized";

export type OrderStatus = "queued" | "in-transit" | "delivered" | "delayed";
export type VehicleStatus = "en-route" | "idle" | "loading" | "offline";
export type ZoneId = "west" | "north" | "core" | "east" | "airport" | "depot";
export type PlaceId =
  | "westHarbor"
  | "northRidge"
  | "cityMarket"
  | "eastPark"
  | "airportCargo";
export type ActivityId = "a1" | "a2" | "a3" | "a4";
export type KpiId = "active" | "transit" | "ontime" | "fleet";

export interface KpiMetric {
  id: KpiId;
  value: string;
  delta: string;
  trend: "up" | "down";
}

export interface Shipment {
  id: string;
  placeId: PlaceId;
  destination: LocalizedText;
  courier: string;
  eta: string;
  status: OrderStatus;
  weight: string;
}

export interface Vehicle {
  id: string;
  driver: string;
  zoneId: ZoneId;
  load: number;
  status: VehicleStatus;
}

export interface ActivityItem {
  id: ActivityId;
  time: string;
}

export const kpiMetrics: KpiMetric[] = [
  { id: "active", value: "24", delta: "+12%", trend: "up" },
  { id: "transit", value: "18", delta: "+4", trend: "up" },
  { id: "ontime", value: "96.4%", delta: "+1.2%", trend: "up" },
  { id: "fleet", value: "12/14", delta: "2", trend: "down" },
];

export const shipments: Shipment[] = [
  {
    id: "SD-10482",
    placeId: "westHarbor",
    destination: { ar: "مركز الميناء الغربي", en: "West Harbor Hub" },
    courier: "Amina K.",
    eta: "14:20",
    status: "in-transit",
    weight: "42 kg",
  },
  {
    id: "SD-10479",
    placeId: "northRidge",
    destination: { ar: "عيادة التلال الشمالية", en: "North Ridge Clinic" },
    courier: "Omar S.",
    eta: "14:45",
    status: "delayed",
    weight: "18 kg",
  },
  {
    id: "SD-10475",
    placeId: "cityMarket",
    destination: { ar: "سوق المدينة ط3", en: "City Market L3" },
    courier: "Lina R.",
    eta: "15:10",
    status: "queued",
    weight: "27 kg",
  },
  {
    id: "SD-10468",
    placeId: "eastPark",
    destination: { ar: "مجمّع الشرق اللوجستي", en: "East Logistics Park" },
    courier: "Yusef T.",
    eta: "—",
    status: "delivered",
    weight: "61 kg",
  },
  {
    id: "SD-10461",
    placeId: "airportCargo",
    destination: { ar: "شحن المطار أ2", en: "Airport Cargo A2" },
    courier: "Noor H.",
    eta: "15:40",
    status: "in-transit",
    weight: "33 kg",
  },
];

export const fleet: Vehicle[] = [
  { id: "VAN-07", driver: "Amina K.", zoneId: "west", load: 78, status: "en-route" },
  { id: "VAN-12", driver: "Omar S.", zoneId: "north", load: 41, status: "en-route" },
  { id: "VAN-03", driver: "Lina R.", zoneId: "core", load: 12, status: "loading" },
  { id: "VAN-19", driver: "Yusef T.", zoneId: "east", load: 0, status: "idle" },
  { id: "VAN-21", driver: "Noor H.", zoneId: "airport", load: 64, status: "en-route" },
  { id: "VAN-05", driver: "—", zoneId: "depot", load: 0, status: "offline" },
];

export const activityFeed: ActivityItem[] = [
  { id: "a1", time: "2m" },
  { id: "a2", time: "8m" },
  { id: "a3", time: "16m" },
  { id: "a4", time: "21m" },
];

export const throughput: { hour: string; value: number }[] = [
  { hour: "08", value: 32 },
  { hour: "09", value: 48 },
  { hour: "10", value: 61 },
  { hour: "11", value: 54 },
  { hour: "12", value: 70 },
  { hour: "13", value: 66 },
  { hour: "14", value: 82 },
  { hour: "15", value: 58 },
];
