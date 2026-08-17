import type { OrderStatus } from "@/generated/prisma/enums";
import type { DriverAssignment, DriverJobStatus } from "@/lib/driver/types";
import type { LocalizedText } from "@/lib/localized";

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
}

function customerNameFromPhone(phone: string): LocalizedText {
  const tail = phone.replace(/\D/g, "").slice(-4);
  return {
    ar: tail ? `عميل ${tail}` : "عميل",
    en: tail ? `Customer ${tail}` : "Customer",
  };
}

export function isDriverJobStatus(status: OrderStatus): status is DriverJobStatus {
  return status === "ASSIGNED" || status === "IN_TRANSIT";
}

export function toDriverAssignment(order: AssignmentRow): DriverAssignment {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: customerNameFromPhone(order.customerPhone),
    customerPhone: order.customerPhone,
    addressText: order.addressText,
    items: [
      {
        name: { ar: "طرد توصيل", en: "Delivery parcel" },
        qty: 1,
      },
    ],
    status: order.status === "IN_TRANSIT" ? "IN_TRANSIT" : "ASSIGNED",
    pickup:
      order.pickupLat != null && order.pickupLng != null
        ? [order.pickupLat, order.pickupLng]
        : null,
    destination: [order.deliveryLat, order.deliveryLng],
  };
}
