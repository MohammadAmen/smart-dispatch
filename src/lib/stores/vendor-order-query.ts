import { VENDOR_ORDER_FILTERS, type VendorOrderFilter } from "@/lib/stores/order-status";

export const VENDOR_ORDERS_PAGE_SIZE = 30;

export const VENDOR_ORDER_SOURCES = ["ALL", "DELIVERY", "DINE_IN"] as const;
export type VendorOrderSource = (typeof VENDOR_ORDER_SOURCES)[number];

export interface VendorOrderCounts {
  ALL: number;
  PENDING_QUOTE: number;
  PENDING: number;
  PREPARING: number;
  READY_FOR_PICKUP: number;
  DELIVERED: number;
}

export interface VendorChannelCounts {
  ALL: number;
  DELIVERY: number;
  DINE_IN: number;
}

export const EMPTY_VENDOR_ORDER_COUNTS: VendorOrderCounts = {
  ALL: 0,
  PENDING_QUOTE: 0,
  PENDING: 0,
  PREPARING: 0,
  READY_FOR_PICKUP: 0,
  DELIVERED: 0,
};

export const EMPTY_VENDOR_CHANNEL_COUNTS: VendorChannelCounts = {
  ALL: 0,
  DELIVERY: 0,
  DINE_IN: 0,
};

export function parseVendorOrderStatus(value: string | string[] | undefined): VendorOrderFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return VENDOR_ORDER_FILTERS.includes(raw as VendorOrderFilter)
    ? (raw as VendorOrderFilter)
    : "ALL";
}

export function parseVendorOrderSource(value: string | string[] | undefined): VendorOrderSource {
  const raw = Array.isArray(value) ? value[0] : value;
  return VENDOR_ORDER_SOURCES.includes(raw as VendorOrderSource)
    ? (raw as VendorOrderSource)
    : "ALL";
}

export function parseVendorOrderPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function vendorOrdersHref(
  pathname: string,
  input: { page?: number; status?: VendorOrderFilter; orderSource?: VendorOrderSource },
): string {
  const params = new URLSearchParams();
  if (input.status && input.status !== "ALL") {
    params.set("status", input.status);
  }
  if (input.orderSource && input.orderSource !== "ALL") {
    params.set("orderSource", input.orderSource);
  }
  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function paginationRange(current: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) {
    items.push("ellipsis");
  }
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) {
    items.push("ellipsis");
  }
  items.push(totalPages);
  return items;
}
