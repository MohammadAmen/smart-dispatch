import type { OrderStatus } from "@/generated/prisma/enums";

export interface VendorOrderItemRecord {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  status: "PENDING" | "SERVED";
  storeName?: string;
}

export interface VendorOrderRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  addressText: string;
  createdAt: string;
  cancelReason: string | null;
  driverName: string | null;
  driverPhone: string | null;
  storePhone: string | null;
  trackingToken: string | null;
  storeNotes: string | null;
  orderType: "STANDARD" | "SPECIAL_CUSTOM";
  customImage: string | null;
  customNotes: string | null;
  scheduledDate: string | null;
  quotedPrice: number | null;
  deliveryFee: number;
  fulfillment: "DELIVERY" | "DINE_IN";
  tableLabel: string | null;
  items: VendorOrderItemRecord[];
  total: number;
}
