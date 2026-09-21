"use client";

import { create } from "zustand";

import { fetchDispatchOrders, postAutoAssign } from "@/lib/dispatch/client";
import type { AssignmentMatch } from "@/lib/dispatch/types";
import {
  liveOrders,
  type DispatchFilter,
  type LiveOrder,
} from "@/lib/live-map";
import { createQueuedAction, persistAction } from "@/lib/offline/sync";
import { registerOutboxSync } from "@/lib/offline/register-sync";
import type { NewDriverAction } from "@/lib/offline/types";
import { useSyncStore } from "@/stores/sync-store";
import { useToastStore } from "@/stores/toast-store";
import { isDispatchAssignable } from "@/lib/stores/order-status";

interface DispatchState {
  orders: LiveOrder[];
  selectedOrderId: string | null;
  detailsOrderId: string | null;
  statusFilter: DispatchFilter;
  queueCollapsed: boolean;
  isAutoDispatching: boolean;
  selectOrder: (orderId: string | null) => void;
  setStatusFilter: (filter: DispatchFilter) => void;
  toggleQueue: () => void;
  setQueueCollapsed: (collapsed: boolean) => void;
  toggleDetails: (orderId: string) => void;
  tickProgress: () => void;
  hydrateOrders: (orders: LiveOrder[]) => void;
  autoAssign: (orderId: string) => Promise<boolean>;
  cancelOrder: (orderId: string) => Promise<void>;
  autoDispatch: (options?: { quiet?: boolean }) => Promise<void>;
}

async function commitActions(inputs: NewDriverAction[]): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  for (const input of inputs) {
    await persistAction(createQueuedAction(input));
  }

  await useSyncStore.getState().hydrate();

  if (navigator.onLine === false) {
    useToastStore.getState().push({
      kind: "queued",
      entityId: inputs[0].entityId,
      actionType: inputs[0].type,
    });
    await registerOutboxSync();
    return;
  }

  await useSyncStore.getState().flush(inputs.length > 1);
}

function applyMatches(orders: LiveOrder[], matches: AssignmentMatch[]): LiveOrder[] {
  if (matches.length === 0) {
    return orders;
  }

  const byNumber = new Map(matches.map((match) => [match.orderNumber, match]));

  return orders.map((order) => {
    const match = byNumber.get(order.id);
    if (!match) {
      return order;
    }

    return {
      ...order,
      status: "ASSIGNED",
      vehicleId: match.vehicleType,
      driverName: match.driverName,
      progress: 0.05,
    };
  });
}

function mergeHydratedOrders(
  current: LiveOrder[],
  incoming: LiveOrder[],
): LiveOrder[] {
  const previous = new Map(current.map((order) => [order.id, order]));

  return incoming.map((order) => {
    const existing = previous.get(order.id);
    if (
      existing &&
      existing.status === "IN_TRANSIT" &&
      order.status === "IN_TRANSIT"
    ) {
      return {
        ...order,
        progress: existing.progress,
        driver: existing.driver,
      };
    }

    return order;
  });
}

export const useDispatchStore = create<DispatchState>()((set, get) => ({
  orders: liveOrders,
  selectedOrderId: liveOrders[0]?.id ?? null,
  detailsOrderId: null,
  statusFilter: "ALL",
  queueCollapsed: false,
  isAutoDispatching: false,

  selectOrder: (orderId) => set({ selectedOrderId: orderId }),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  toggleQueue: () =>
    set((state) => ({ queueCollapsed: !state.queueCollapsed })),

  setQueueCollapsed: (collapsed) => set({ queueCollapsed: collapsed }),

  toggleDetails: (orderId) =>
    set((state) => ({
      selectedOrderId: orderId,
      detailsOrderId: state.detailsOrderId === orderId ? null : orderId,
    })),

  tickProgress: () =>
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.status !== "IN_TRANSIT") {
          return order;
        }

        const next = order.progress + 0.012;
        return { ...order, progress: next >= 0.92 ? 0.18 : next };
      }),
    })),

  hydrateOrders: (incoming) =>
    set((state) => {
      const orders = mergeHydratedOrders(state.orders, incoming);
      const selectedStillExists = orders.some(
        (order) => order.id === state.selectedOrderId,
      );

      return {
        orders,
        selectedOrderId: selectedStillExists
          ? state.selectedOrderId
          : (orders[0]?.id ?? null),
      };
    }),

  autoAssign: async (orderId) => {
    const current = get().orders.find((order) => order.id === orderId);
    if (!current || !isDispatchAssignable(current.status, current.storeId)) {
      return false;
    }

    if (navigator.onLine) {
      const result = await postAutoAssign(orderId);
      if (result && result.assignedCount > 0) {
        set((state) => ({
          selectedOrderId: orderId,
          orders: applyMatches(state.orders, result.matches),
        }));

        const fresh = await fetchDispatchOrders();
        if (fresh) {
          get().hydrateOrders(fresh);
        }

        return true;
      }

      if (result) {
        useToastStore.getState().push({ kind: "autoAssignEmpty" });
        return false;
      }

      useToastStore.getState().push({ kind: "autoAssignFailed" });
      return false;
    }

    useToastStore.getState().push({ kind: "autoAssignFailed" });
    return false;
  },

  cancelOrder: async (orderId) => {
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId
          ? { ...order, status: "CANCELED", vehicleId: "—", driverName: "—" }
          : order,
      ),
      selectedOrderId:
        state.selectedOrderId === orderId ? null : state.selectedOrderId,
      detailsOrderId:
        state.detailsOrderId === orderId ? null : state.detailsOrderId,
    }));

    await commitActions([{ type: "ORDER_CANCELED", entityId: orderId }]);
  },

  autoDispatch: async (options) => {
    if (get().isAutoDispatching) {
      return;
    }

    const quiet = options?.quiet === true;
    const pending = get().orders.filter((order) =>
      isDispatchAssignable(order.status, order.storeId),
    );
    if (pending.length === 0) {
      return;
    }

    set({ isAutoDispatching: true });

    try {
      if (!navigator.onLine) {
        if (!quiet) {
          useToastStore.getState().push({ kind: "autoAssignFailed" });
        }
        return;
      }

      const result = await postAutoAssign();
      if (result) {
        set((state) => ({
          orders: applyMatches(state.orders, result.matches),
          selectedOrderId: result.matches[0]?.orderNumber ?? state.selectedOrderId,
        }));

        const fresh = await fetchDispatchOrders();
        if (fresh) {
          get().hydrateOrders(fresh);
        }

        if (result.assignedCount > 0) {
          useToastStore.getState().push({
            kind: "autoAssigned",
            count: result.assignedCount,
          });
        } else if (!quiet) {
          useToastStore.getState().push({ kind: "autoAssignEmpty" });
        }
        return;
      }

      if (!quiet) {
        useToastStore.getState().push({ kind: "autoAssignFailed" });
      }
    } finally {
      set({ isAutoDispatching: false });
    }
  },
}));

let filteredOrdersSnapshot: {
  orders: LiveOrder[];
  statusFilter: DispatchFilter;
  result: LiveOrder[];
} | null = null;

export function selectFilteredOrders(state: DispatchState): LiveOrder[] {
  if (
    filteredOrdersSnapshot &&
    filteredOrdersSnapshot.orders === state.orders &&
    filteredOrdersSnapshot.statusFilter === state.statusFilter
  ) {
    return filteredOrdersSnapshot.result;
  }

  const result =
    state.statusFilter === "ALL"
      ? state.orders
      : state.orders.filter((order) => order.status === state.statusFilter);

  filteredOrdersSnapshot = {
    orders: state.orders,
    statusFilter: state.statusFilter,
    result,
  };

  return result;
}

export function selectPendingAssignCount(state: DispatchState): number {
  return state.orders.filter((order) =>
    isDispatchAssignable(order.status, order.storeId),
  ).length;
}
