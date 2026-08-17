"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AssignmentCard } from "@/components/driver/assignment-card";
import { DriverActionBar, type DriverActionKind } from "@/components/driver/driver-action-bar";
import { DriverIdle } from "@/components/driver/driver-idle";
import { DriverMiniMap } from "@/components/driver/driver-mini-map";
import { DriverPicker } from "@/components/driver/driver-picker";
import { DriverStatusBar } from "@/components/driver/driver-status-bar";
import { DriverUnassigned } from "@/components/driver/driver-unassigned";
import { useLocale } from "@/components/providers/locale-provider";
import { useDriverAlerts } from "@/hooks/use-driver-alerts";
import { useDriverGeolocation } from "@/hooks/use-driver-geolocation";
import { playDeliverySuccessSound } from "@/lib/audio";
import type { DriverAccess, DriverAssignment, DriverDutyStatus } from "@/lib/driver/types";
import { latestQueuedStatus, useSyncStore } from "@/stores/sync-store";
import { useDriverStore } from "@/stores/driver-store";

export function DriverApp({ access }: { access: DriverAccess }): ReactNode {
  const { t } = useLocale();
  const driverId = useDriverStore((state) => state.driverId);
  const driverName = useDriverStore((state) => state.driverName);
  const vehicleType = useDriverStore((state) => state.vehicleType);
  const dutyStatus = useDriverStore((state) => state.dutyStatus);
  const location = useDriverStore((state) => state.location);
  const locationError = useDriverStore((state) => state.locationError);
  const assignment = useDriverStore((state) => state.assignment);
  const accepted = useDriverStore((state) => state.accepted);
  const drivers = useDriverStore((state) => state.drivers);
  const isHydrated = useDriverStore((state) => state.isHydrated);
  const hydrate = useDriverStore((state) => state.hydrate);
  const selectDriver = useDriverStore((state) => state.selectDriver);
  const resetDriver = useDriverStore((state) => state.resetDriver);
  const setDutyStatus = useDriverStore((state) => state.setDutyStatus);
  const acceptAssignment = useDriverStore((state) => state.acceptAssignment);
  const clearAssignment = useDriverStore((state) => state.clearAssignment);
  const enqueue = useSyncStore((state) => state.enqueue);
  const queue = useSyncStore((state) => state.queue);
  const { permission, requestPermission } = useDriverAlerts();
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [busy, setBusy] = useState(false);

  useDriverGeolocation();

  useEffect(() => {
    if (access.kind === "unassigned") {
      return;
    }

    if (access.kind === "self") {
      void (async () => {
        await selectDriver(access.driverId);
        await requestPermission();
      })();
      return;
    }

    void hydrate();
  }, [access, hydrate, requestPermission, selectDriver]);

  useEffect(() => {
    const onOnline = (): void => setOnline(true);
    const onOffline = (): void => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    const pull = (): void => {
      void hydrate();
    };

    const timer = window.setInterval(pull, 8_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [driverId, hydrate]);

  const visibleAssignment = useMemo((): DriverAssignment | null => {
    if (!assignment) {
      return null;
    }

    const queued = latestQueuedStatus(queue, assignment.orderNumber);
    if (queued?.type === "ORDER_DELIVERED") {
      return null;
    }

    if (queued?.type === "ORDER_IN_TRANSIT") {
      return { ...assignment, status: "IN_TRANSIT" };
    }

    return assignment;
  }, [assignment, queue]);

  const visibleDuty = useMemo((): DriverDutyStatus => {
    if (!driverId) {
      return dutyStatus;
    }

    const queued = latestQueuedStatus(queue, driverId);
    if (queued?.type === "DRIVER_OFFLINE") {
      return "OFFLINE";
    }

    if (queued?.type === "DRIVER_AVAILABLE" || queued?.type === "DRIVER_BUSY") {
      return "AVAILABLE";
    }

    return dutyStatus;
  }, [driverId, dutyStatus, queue]);

  const locationPayload = useCallback((): Record<string, number> => {
    const point = useDriverStore.getState().location;
    if (!point) {
      return {};
    }

    return { latitude: point[0], longitude: point[1] };
  }, []);

  const onDutyChange = useCallback(
    async (status: DriverDutyStatus): Promise<void> => {
      const id = useDriverStore.getState().driverId;
      if (!id) {
        return;
      }

      setDutyStatus(status);
      await enqueue({
        type: status === "AVAILABLE" ? "DRIVER_AVAILABLE" : "DRIVER_OFFLINE",
        entityId: id,
        payload: locationPayload(),
      });
    },
    [enqueue, locationPayload, setDutyStatus],
  );

  const onAction = useCallback(
    async (kind: DriverActionKind): Promise<void> => {
      const current = useDriverStore.getState().assignment;
      if (!current) {
        return;
      }

      if (kind === "accept") {
        acceptAssignment();
        return;
      }

      setBusy(true);
      try {
        if (kind === "inTransit") {
          await enqueue({
            type: "ORDER_IN_TRANSIT",
            entityId: current.orderNumber,
            payload: locationPayload(),
          });
          return;
        }

        await enqueue({
          type: "ORDER_DELIVERED",
          entityId: current.orderNumber,
          payload: locationPayload(),
        });
        playDeliverySuccessSound();
        clearAssignment();
      } finally {
        setBusy(false);
      }
    },
    [acceptAssignment, clearAssignment, enqueue, locationPayload],
  );

  if (access.kind === "unassigned") {
    return <DriverUnassigned />;
  }

  if (!isHydrated || (access.kind === "self" && driverId !== access.driverId)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <span className="h-12 w-12 animate-pulse rounded-full bg-primary/30" />
      </div>
    );
  }

  if (!driverId) {
    return (
      <DriverPicker
        drivers={drivers}
        onSelect={(id) => {
          void (async () => {
            await selectDriver(id);
            await requestPermission();
          })();
        }}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <DriverStatusBar
        driverName={driverName}
        vehicleType={vehicleType}
        dutyStatus={visibleDuty}
        online={online}
        onDutyChange={(status) => {
          void onDutyChange(status);
        }}
        onSwitchDriver={access.kind === "staff" ? resetDriver : undefined}
        alertsPermission={permission}
        onEnableAlerts={() => {
          void requestPermission();
        }}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {locationError ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {locationError === "unsupported"
              ? t("driver.gpsUnsupported")
              : t("driver.gpsDenied")}
          </p>
        ) : null}

        {visibleAssignment ? (
          <>
            <AssignmentCard assignment={visibleAssignment} />
            <DriverMiniMap
              assignment={visibleAssignment}
              driverPoint={location}
            />
            {!online ? (
              <p className="text-center text-xs text-muted-foreground">
                {t("driver.queuedHint")}
              </p>
            ) : null}
          </>
        ) : (
          <DriverIdle dutyStatus={visibleDuty} />
        )}
      </main>

      {visibleAssignment ? (
        <DriverActionBar
          assignment={visibleAssignment}
          accepted={accepted || visibleAssignment.status === "IN_TRANSIT"}
          busy={busy}
          onAction={(kind) => {
            void onAction(kind);
          }}
        />
      ) : null}
    </div>
  );
}
