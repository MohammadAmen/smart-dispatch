import type { DriverStatus, OrderStatus } from "@/generated/prisma/enums";
import type { DispatchStatus, LiveOrder } from "@/lib/live-map";
import { MAP_CENTER } from "@/lib/live-map";

export interface OrderRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerPhone: string;
  addressText: string;
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryLat: number;
  deliveryLng: number;
  storeId: string | null;
  driver: {
    id: string;
    status: DriverStatus;
    vehicleType: string;
    latitude: number | null;
    longitude: number | null;
    user: {
      name: string;
    };
  } | null;
}

const progressByStatus: Record<OrderStatus, number> = {
  PENDING: 0.08,
  PENDING_QUOTE: 0.04,
  QUOTE_ACCEPTED: 0.1,
  PREPARING: 0.22,
  READY_FOR_PICKUP: 0.38,
  ASSIGNED: 0.52,
  IN_TRANSIT: 0.74,
  DELIVERED: 1,
  CANCELED: 0,
};

export const orderWithDriver = {
  driver: {
    include: {
      user: {
        select: { name: true },
      },
    },
  },
} as const;

export function emptyStatusCounts(): Record<DispatchStatus, number> {
  return {
    PENDING: 0,
    PREPARING: 0,
    READY_FOR_PICKUP: 0,
    ASSIGNED: 0,
    IN_TRANSIT: 0,
    DELIVERED: 0,
    CANCELED: 0,
  };
}

export function toLiveOrder(order: OrderRecord): LiveOrder {
  const driverLat =
    order.driver?.latitude ?? order.pickupLat ?? MAP_CENTER[0];
  const driverLng =
    order.driver?.longitude ?? order.pickupLng ?? MAP_CENTER[1];

  return {
    id: order.orderNumber,
    vehicleId: order.driver
      ? `${order.driver.vehicleType}-${order.driver.id.slice(0, 4).toUpperCase()}`
      : "—",
    driverName: order.driver?.user.name ?? "—",
    destination: { ar: order.addressText, en: order.addressText },
    eta: etaLabel(order.status),
    status: toDispatchStatus(order.status),
    delayed: false,
    driver: [driverLat, driverLng],
    destinationPoint: [order.deliveryLat, order.deliveryLng],
    progress: progressByStatus[order.status],
    customerPhone: order.customerPhone,
    weight: "—",
    storeId: order.storeId,
  };
}

function toDispatchStatus(status: OrderStatus): DispatchStatus {
  if (status === "PENDING_QUOTE" || status === "QUOTE_ACCEPTED") {
    return "PENDING";
  }
  return status;
}

function etaLabel(status: OrderStatus): string {
  if (status === "DELIVERED" || status === "CANCELED") {
    return "—";
  }

  if (
    status === "PENDING" ||
    status === "PREPARING" ||
    status === "READY_FOR_PICKUP" ||
    status === "PENDING_QUOTE" ||
    status === "QUOTE_ACCEPTED"
  ) {
    return "—";
  }

  const eta = new Date(Date.now() + 25 * 60_000);
  return eta.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
