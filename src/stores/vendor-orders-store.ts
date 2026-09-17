"use client";

import { create } from "zustand";

import type { VendorOrderRecord } from "@/lib/stores/order-types";
import {
  EMPTY_VENDOR_ORDER_COUNTS,
  type VendorOrderCounts,
} from "@/lib/stores/vendor-order-query";

function activeOrderCount(counts: VendorOrderCounts): number {
  return counts.PENDING + counts.PREPARING + counts.READY_FOR_PICKUP;
}

interface VendorOrdersState {
  orders: VendorOrderRecord[];
  counts: VendorOrderCounts;
  pendingCount: number;
  activeCount: number;
  hydrate: (orders: VendorOrderRecord[], counts?: VendorOrderCounts) => void;
  setPendingCount: (count: number) => void;
  replaceOrder: (order: VendorOrderRecord) => void;
  patchOrder: (orderId: string, patch: (order: VendorOrderRecord) => VendorOrderRecord) => void;
}

export const useVendorOrdersStore = create<VendorOrdersState>()((set) => ({
  orders: [],
  counts: EMPTY_VENDOR_ORDER_COUNTS,
  pendingCount: 0,
  activeCount: 0,
  hydrate: (orders, counts) =>
    set((state) => {
      const nextCounts = counts ?? state.counts;
      return {
        orders,
        counts: nextCounts,
        pendingCount: nextCounts.PENDING,
        activeCount: activeOrderCount(nextCounts),
      };
    }),
  setPendingCount: (pendingCount) =>
    set((state) => ({
      pendingCount,
      counts: { ...state.counts, PENDING: pendingCount },
      activeCount: state.activeCount - state.counts.PENDING + pendingCount,
    })),
  replaceOrder: (order) =>
    set((state) => ({
      orders: state.orders.some((row) => row.id === order.id)
        ? state.orders.map((row) => (row.id === order.id ? order : row))
        : [order, ...state.orders],
    })),
  patchOrder: (orderId, patch) =>
    set((state) => ({
      orders: state.orders.map((row) => (row.id === orderId ? patch(row) : row)),
    })),
}));
