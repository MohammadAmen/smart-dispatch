"use client";

import { AnimatePresence, m } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { deleteFleetVehicleRequest, fleetErrorMessage } from "@/lib/fleet/client";
import type { FleetVehicle, VehicleDeleteResult } from "@/lib/fleet/types";

interface DeleteVehicleModalProps {
  vehicle: FleetVehicle | null;
  onClose: () => void;
  onDeleted: (result: VehicleDeleteResult) => void;
}

export function DeleteVehicleModal({
  vehicle,
  onClose,
  onDeleted,
}: DeleteVehicleModalProps): ReactNode {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setError(null);
    setWorking(false);
  }, [vehicle?.id]);

  const busy = vehicle?.driver?.status === "BUSY";

  const onConfirm = async (): Promise<void> => {
    if (!vehicle) {
      return;
    }

    setWorking(true);
    setError(null);

    const response = await deleteFleetVehicleRequest(vehicle.id);
    setWorking(false);

    if (!response.ok) {
      const key = fleetErrorMessage(response.error);
      setError(key.startsWith("fleet.") ? t(key) : response.error);
      return;
    }

    onDeleted(response.result);
    onClose();
  };

  return (
    <AnimatePresence>
      {vehicle ? (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/55 backdrop-blur-sm"
            aria-label={t("common.cancel")}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-vehicle-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md"
          >
            <GlassCard hover={false}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                    <Trash2 className="size-4" />
                  </span>
                  <div>
                    <h2 id="delete-vehicle-title" className="text-sm font-semibold">
                      {t("fleet.deleteTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground">{t("fleet.deleteHint")}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={t("common.cancel")} onPress={onClose}>
                  <X />
                </Button>
              </div>

              <p className="mt-4 text-sm">
                {t("fleet.deleteConfirm", { plate: vehicle.plateNumber })}
              </p>
              {vehicle.driver ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("fleet.deleteAssigned", { name: vehicle.driver.name })}
                </p>
              ) : null}
              {busy ? (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  {t("fleet.deleteBusy")}
                </p>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-5 flex gap-2">
                <Button
                  variant="destructive"
                  isDisabled={working}
                  onPress={() => {
                    void onConfirm();
                  }}
                >
                  {working ? t("fleet.deleting") : t("common.delete")}
                </Button>
                <Button variant="ghost" onPress={onClose}>
                  {t("common.cancel")}
                </Button>
              </div>
            </GlassCard>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
