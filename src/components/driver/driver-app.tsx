"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AssignmentCard } from "@/components/driver/assignment-card";
import { DeliveryProofSheet } from "@/components/driver/delivery-proof-sheet";
import { DriverActionBar, type DriverActionKind } from "@/components/driver/driver-action-bar";
import { DriverIdle } from "@/components/driver/driver-idle";
import { DriverMiniMap } from "@/components/driver/driver-mini-map";
import { DriverPicker } from "@/components/driver/driver-picker";
import { DriverStatusBar } from "@/components/driver/driver-status-bar";
import { DriverUnassigned } from "@/components/driver/driver-unassigned";
import { IncomingOrderOverlay } from "@/components/driver/incoming-order-overlay";
import { useLocale } from "@/components/providers/locale-provider";
import { useDriverAlerts } from "@/hooks/use-driver-alerts";
import { useDriverGeolocation } from "@/hooks/use-driver-geolocation";
import { playDeliverySuccessSound, stopIncomingRingtone } from "@/lib/audio";
import { patchDriver, presentDriverOffer, respondToDriverOffer } from "@/lib/driver/client";
import { dismissNativeOffer, syncNativeDuty } from "@/lib/driver/native-duty";
import { resaveNativePushToken } from "@/lib/notifications/native-push";
import type { DriverAccess, DriverAssignment, DriverDutyStatus } from "@/lib/driver/types";
import { stopIncomingVibrate } from "@/lib/notify";
import { latestOpenDutyAction, latestQueuedStatus, useSyncStore } from "@/stores/sync-store";
import { useDriverStore } from "@/stores/driver-store";
import { deleteDutyActionsForEntity } from "@/lib/offline/idb";

export function DriverApp({ access }: { access: DriverAccess }): ReactNode {
  const { t } = useLocale();
  const driverId = useDriverStore((state) => state.driverId);
  const driverName = useDriverStore((state) => state.driverName);
  const vehicleType = useDriverStore((state) => state.vehicleType);
  const dutyStatus = useDriverStore((state) => state.dutyStatus);
  const dutyIntentAt = useDriverStore((state) => state.dutyIntentAt);
  const location = useDriverStore((state) => state.location);
  const locationError = useDriverStore((state) => state.locationError);
  const assignment = useDriverStore((state) => state.assignment);
  const accepted = useDriverStore((state) => state.accepted);
  const dailyEarnings = useDriverStore((state) => state.dailyEarnings);
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
  const [proofOpen, setProofOpen] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

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

  useEffect(() => {
    void resaveNativePushToken();
  }, [driverId]);

  useEffect(() => {
    if (!driverId || !assignment || accepted || assignment.status !== "ASSIGNED") {
      return;
    }
    if (assignment.offerPresentedAt) {
      return;
    }

    let cancelled = false;
    void presentDriverOffer(assignment.orderId).then((presentedAt) => {
      if (!cancelled && presentedAt) {
        void hydrate();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [accepted, assignment, driverId, hydrate]);

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

    // Keep the driver's last tap sticky so a background hydrate/sync cannot flip it back.
    if (dutyIntentAt > 0 && Date.now() - dutyIntentAt < 45_000) {
      return dutyStatus;
    }

    const queued = latestOpenDutyAction(queue, driverId);
    if (queued?.type === "DRIVER_OFFLINE") {
      return "OFFLINE";
    }

    if (queued?.type === "DRIVER_AVAILABLE" || queued?.type === "DRIVER_BUSY") {
      return "AVAILABLE";
    }

    return dutyStatus;
  }, [driverId, dutyIntentAt, dutyStatus, queue]);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    const sync = (): void => {
      if (visibleDuty === "OFFLINE") {
        void syncNativeDuty(null);
        return;
      }
      void syncNativeDuty({
        driverId,
        title: t("driver.onDuty"),
        body: t("driver.onDutyNotice"),
      });
    };

    sync();
    const onVisible = (): void => {
      if (document.visibilityState === "visible") {
        sync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [driverId, t, visibleDuty]);

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
      const payload = locationPayload();
      if (navigator.onLine) {
        const session = await patchDriver({
          driverId: id,
          status,
          ...(typeof payload.latitude === "number" && typeof payload.longitude === "number"
            ? { latitude: payload.latitude, longitude: payload.longitude }
            : {}),
        });
        if (session) {
          await deleteDutyActionsForEntity(id);
          await useSyncStore.getState().hydrate();
          setDutyStatus(status);
          return;
        }
      }

      await enqueue({
        type: status === "AVAILABLE" ? "DRIVER_AVAILABLE" : "DRIVER_OFFLINE",
        entityId: id,
        payload,
      });
    },
    [enqueue, locationPayload, setDutyStatus],
  );

  const respondToOffer = useCallback(
    async (action: "accept" | "reject" | "timeout"): Promise<void> => {
      const current = useDriverStore.getState().assignment;
      const id = useDriverStore.getState().driverId;
      if (!current || !id) {
        return;
      }

      stopIncomingRingtone();
      stopIncomingVibrate();
      void dismissNativeOffer();
      setBusy(true);

      try {
        const ok = await respondToDriverOffer({
          driverId: id,
          orderId: current.orderId,
          action,
        });

        if (action === "accept") {
          if (ok) {
            acceptAssignment();
          }
          await hydrate();
          return;
        }

        if (action === "timeout") {
          setDutyStatus("OFFLINE");
          const payload = locationPayload();
          if (navigator.onLine) {
            const session = await patchDriver({
              driverId: id,
              status: "OFFLINE",
              ...(typeof payload.latitude === "number" && typeof payload.longitude === "number"
                ? { latitude: payload.latitude, longitude: payload.longitude }
                : {}),
            });
            if (!session) {
              await enqueue({
                type: "DRIVER_OFFLINE",
                entityId: id,
                payload,
              });
            } else {
              await deleteDutyActionsForEntity(id);
              await useSyncStore.getState().hydrate();
            }
          } else {
            await enqueue({
              type: "DRIVER_OFFLINE",
              entityId: id,
              payload,
            });
          }
        }

        clearAssignment();
        await hydrate();
      } finally {
        setBusy(false);
      }
    },
    [acceptAssignment, clearAssignment, enqueue, hydrate, locationPayload, setDutyStatus],
  );

  const completeDelivery = useCallback(
    async (proof: { otp: string; photoUrl: string | null }): Promise<void> => {
      const current = useDriverStore.getState().assignment;
      if (!current) {
        return;
      }
      await enqueue({
        type: "ORDER_DELIVERED",
        entityId: current.orderNumber,
        payload: {
          ...locationPayload(),
          ...(proof.otp ? { deliveryProofOtp: proof.otp } : {}),
          ...(proof.photoUrl ? { deliveryProofPhotoUrl: proof.photoUrl } : {}),
        },
      });
      playDeliverySuccessSound();
      clearAssignment();
      setProofOpen(false);
      setProofError(null);
    },
    [clearAssignment, enqueue, locationPayload],
  );

  const onAction = useCallback(
    async (kind: DriverActionKind): Promise<void> => {
      const current = useDriverStore.getState().assignment;
      if (!current) {
        return;
      }

      if (kind === "accept") {
        await respondToOffer("accept");
        return;
      }

      if (kind === "inTransit") {
        setBusy(true);
        try {
          await enqueue({
            type: "ORDER_IN_TRANSIT",
            entityId: current.orderNumber,
            payload: locationPayload(),
          });
        } finally {
          setBusy(false);
        }
        return;
      }

      const mode = current.deliveryProofMode ?? "NONE";
      if (mode !== "NONE") {
        setProofError(null);
        setProofOpen(true);
        return;
      }

      setBusy(true);
      try {
        await completeDelivery({ otp: "", photoUrl: null });
      } finally {
        setBusy(false);
      }
    },
    [completeDelivery, enqueue, locationPayload, respondToOffer],
  );

  const onProofConfirm = useCallback(
    async (input: { otp: string; photo: File | null }): Promise<void> => {
      const current = useDriverStore.getState().assignment;
      if (!current || !driverId) {
        return;
      }
      setBusy(true);
      setProofError(null);
      try {
        const form = new FormData();
        form.set("orderId", current.orderId);
        form.set("driverId", driverId);
        if (input.otp) {
          form.set("otp", input.otp);
        }
        if (input.photo) {
          form.set("photo", input.photo);
        }
        if (!navigator.onLine) {
          // Offline: queue with OTP; server re-validates on sync.
          if ((current.deliveryProofMode === "PHOTO" || current.deliveryProofMode === "BOTH") && !input.photo) {
            setProofError(t("driver.proofPhotoRequired"));
            return;
          }
          await completeDelivery({ otp: input.otp, photoUrl: null });
          return;
        }

        const response = await fetch("/api/driver/delivery-proof", {
          method: "POST",
          body: form,
        });
        const body = (await response.json()) as { ok?: boolean; error?: string; photoUrl?: string };
        if (!response.ok || !body.ok) {
          const code = body.error ?? "proof-failed";
          setProofError(
            code === "invalid-otp"
              ? t("driver.proofInvalidOtp")
              : code === "photo-required"
                ? t("driver.proofPhotoRequired")
                : t("driver.proofFailed"),
          );
          return;
        }
        await completeDelivery({
          otp: input.otp,
          photoUrl: body.photoUrl ?? null,
        });
      } catch {
        // Network blip: still queue OTP for later server validation.
        if (input.otp || current.deliveryProofMode === "NONE") {
          await completeDelivery({ otp: input.otp, photoUrl: null });
          return;
        }
        setProofError(t("driver.proofFailed"));
      } finally {
        setBusy(false);
      }
    },
    [completeDelivery, driverId, t],
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
        dailyEarnings={dailyEarnings}
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
            {!proofOpen ? (
              <DriverMiniMap
                assignment={visibleAssignment}
                driverPoint={location}
              />
            ) : null}
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

      {visibleAssignment &&
      !proofOpen &&
      (accepted || visibleAssignment.status === "IN_TRANSIT") ? (
        <DriverActionBar
          assignment={visibleAssignment}
          accepted
          busy={busy}
          onAction={(kind) => {
            void onAction(kind);
          }}
        />
      ) : null}

      <AnimatePresence>
        {visibleAssignment && visibleAssignment.status === "ASSIGNED" && !accepted ? (
          <IncomingOrderOverlay
            key={visibleAssignment.orderId}
            assignment={visibleAssignment}
            driverPoint={location}
            busy={busy}
            onAccept={() => {
              void respondToOffer("accept");
            }}
            onReject={() => {
              void respondToOffer("reject");
            }}
            onTimeout={() => {
              void respondToOffer("timeout");
            }}
          />
        ) : null}
      </AnimatePresence>

      {proofOpen && visibleAssignment ? (
        <DeliveryProofSheet
          mode={visibleAssignment.deliveryProofMode ?? "NONE"}
          orderNumber={visibleAssignment.orderNumber}
          busy={busy}
          error={proofError}
          onCancel={() => {
            setProofOpen(false);
            setProofError(null);
          }}
          onConfirm={(input) => {
            void onProofConfirm(input);
          }}
        />
      ) : null}
    </div>
  );
}
