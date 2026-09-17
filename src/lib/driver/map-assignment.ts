import type { OrderStatus } from "@/generated/prisma/enums";
import type { DriverAssignment, DriverJobStatus, DriverOrderItem, DriverStop } from "@/lib/driver/types";
import type { LocalizedText } from "@/lib/localized";
import type { LatLngTuple } from "@/lib/live-map";

interface AssignmentRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerPhone: string;
  addressText: string;
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryLat: number;
  deliveryLng: number;
  deliveryFee?: number | null;
  offeredAt?: Date | null;
  driverAcceptedAt?: Date | null;
}

export interface AssignmentExtras {
  items?: DriverOrderItem[];
  stops?: DriverStop[];
  storeName?: string | null;
  distanceKm?: number | null;
}

function customerNameFromPhone(phone: string): LocalizedText {
  const tail = phone.replace(/\D/g, "").slice(-4);
  return {
    ar: tail ? `عميل ${tail}` : "عميل",
    en: tail ? `Customer ${tail}` : "Customer",
  };
}

function point(lat: number | null, lng: number | null): LatLngTuple | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return [lat, lng];
}

export function isDriverJobStatus(status: OrderStatus): status is DriverJobStatus {
  return status === "ASSIGNED" || status === "IN_TRANSIT";
}

export function toDriverAssignment(order: AssignmentRow, extras: AssignmentExtras = {}): DriverAssignment {
  const pickup = point(order.pickupLat, order.pickupLng);
  const destination: LatLngTuple = [order.deliveryLat, order.deliveryLng];
  const defaultStops: DriverStop[] = [
    ...(pickup
      ? [
          {
            kind: "pickup" as const,
            title: { ar: "نقطة الاستلام", en: "Pickup" },
            detail: "",
            point: pickup,
          },
        ]
      : []),
    {
      kind: "dropoff",
      title: { ar: "عنوان العميل", en: "Customer drop-off" },
      detail: order.addressText,
      point: destination,
    },
  ];

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: customerNameFromPhone(order.customerPhone),
    customerPhone: order.customerPhone,
    addressText: order.addressText,
    items: extras.items ?? [
      {
        name: { ar: "طرد توصيل", en: "Delivery parcel" },
        qty: 1,
      },
    ],
    status: order.status === "IN_TRANSIT" ? "IN_TRANSIT" : "ASSIGNED",
    pickup,
    destination,
    stops: extras.stops && extras.stops.length > 0 ? extras.stops : defaultStops,
    storeName: extras.storeName ?? null,
    distanceKm: extras.distanceKm ?? null,
    expectedEarnings: Number.isFinite(order.deliveryFee) ? Math.max(0, Number(order.deliveryFee)) : 0,
    offeredAt: order.offeredAt ? order.offeredAt.toISOString() : null,
    acceptedAt: order.driverAcceptedAt ? order.driverAcceptedAt.toISOString() : null,
  };
}
