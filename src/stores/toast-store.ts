"use client";

import { create } from "zustand";

import type { DriverActionType } from "@/lib/offline/types";

export type ToastKind =
  | "queued"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "incoming"
  | "audio";

export interface SyncToast {
  id: string;
  kind: ToastKind;
  count?: number;
  entityId?: string;
  actionType?: DriverActionType;
  muted?: boolean;
}

interface ToastState {
  toasts: SyncToast[];
  push: (toast: Omit<SyncToast, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { ...toast, id }],
    }));
    window.setTimeout(() => {
      useToastStore.getState().dismiss(id);
    }, 4200);
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
