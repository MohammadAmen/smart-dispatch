import { create } from "zustand";

export type ConnectionStatus = "online" | "offline" | "degraded";

interface OpsState {
  connectionStatus: ConnectionStatus;
  activeOrders: number;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveOrders: (count: number) => void;
}

export const useOpsStore = create<OpsState>()((set) => ({
  connectionStatus: "online",
  activeOrders: 24,
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setActiveOrders: (count) => set({ activeOrders: count }),
}));
