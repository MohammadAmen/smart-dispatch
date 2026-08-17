"use client";

import { create } from "zustand";

import { fetchDriverSession } from "@/lib/driver/client";
import {
  clearDriverId,
  readAcceptedOrderNumber,
  readDriverId,
  readStoredLocation,
  writeAcceptedOrderNumber,
  writeDriverId,
  writeStoredLocation,
} from "@/lib/driver/storage";
import type {
  DriverAssignment,
  DriverDutyStatus,
  DriverProfile,
} from "@/lib/driver/types";
import type { LatLngTuple } from "@/lib/live-map";

interface DriverState {
  driverId: string | null;
  driverName: string;
  vehicleType: string;
  dutyStatus: DriverDutyStatus;
  location: LatLngTuple | null;
  locationError: string | null;
  assignment: DriverAssignment | null;
  accepted: boolean;
  drivers: DriverProfile[];
  isHydrated: boolean;
  isBusy: boolean;
  hydrate: () => Promise<void>;
  selectDriver: (driverId: string) => Promise<void>;
  resetDriver: () => void;
  setDutyStatus: (status: DriverDutyStatus) => void;
  setLocation: (point: LatLngTuple) => void;
  setLocationError: (message: string | null) => void;
  acceptAssignment: () => void;
  clearAssignment: () => void;
}

function dutyFromServer(
  status: DriverProfile["status"] | undefined,
): DriverDutyStatus {
  return status === "OFFLINE" ? "OFFLINE" : "AVAILABLE";
}

export const useDriverStore = create<DriverState>()((set, get) => ({
  driverId: null,
  driverName: "",
  vehicleType: "",
  dutyStatus: "OFFLINE",
  location: null,
  locationError: null,
  assignment: null,
  accepted: false,
  drivers: [],
  isHydrated: false,
  isBusy: false,

  hydrate: async () => {
    const storedId = get().driverId ?? readDriverId();
    const storedLocation = get().location ?? readStoredLocation();
    const session = await fetchDriverSession(storedId);

    if (!session) {
      set({
        driverId: storedId,
        location: storedLocation,
        isHydrated: true,
      });
      return;
    }

    const driver =
      session.driver ??
      session.drivers.find((row) => row.id === storedId) ??
      null;
    const assignment = session.assignment;
    const acceptedStored = readAcceptedOrderNumber();
    const accepted =
      assignment?.status === "IN_TRANSIT" ||
      (assignment != null && acceptedStored === assignment.orderNumber);

    set({
      drivers: session.drivers,
      driverId: driver?.id ?? storedId,
      driverName: driver?.name ?? "",
      vehicleType: driver?.vehicleType ?? "",
      dutyStatus: dutyFromServer(driver?.status),
      assignment,
      accepted,
      location: storedLocation ?? get().location,
      isHydrated: true,
    });

    if (!assignment || acceptedStored !== assignment.orderNumber) {
      if (assignment?.status !== "IN_TRANSIT") {
        writeAcceptedOrderNumber(
          accepted && assignment ? assignment.orderNumber : null,
        );
      }
    }
  },

  selectDriver: async (driverId) => {
    writeDriverId(driverId);
    set({ driverId, isBusy: true });
    await get().hydrate();
    set({ isBusy: false });
  },

  resetDriver: () => {
    clearDriverId();
    writeAcceptedOrderNumber(null);
    set({
      driverId: null,
      driverName: "",
      vehicleType: "",
      assignment: null,
      accepted: false,
      dutyStatus: "OFFLINE",
    });
  },

  setDutyStatus: (status) => set({ dutyStatus: status }),

  setLocation: (point) => {
    writeStoredLocation(point);
    set({ location: point, locationError: null });
  },

  setLocationError: (message) => set({ locationError: message }),

  acceptAssignment: () => {
    const assignment = get().assignment;
    if (!assignment) {
      return;
    }

    writeAcceptedOrderNumber(assignment.orderNumber);
    set({ accepted: true });
  },

  clearAssignment: () => {
    writeAcceptedOrderNumber(null);
    set({ assignment: null, accepted: false });
  },
}));
