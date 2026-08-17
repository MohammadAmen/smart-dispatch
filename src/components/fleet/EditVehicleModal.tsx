"use client";

import { AnimatePresence, m } from "framer-motion";
import { Pencil, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fetchCatalogLists } from "@/lib/catalog/client";
import type { CatalogVehicleType, DeliveryZone } from "@/lib/catalog/types";
import { fleetErrorMessage, updateFleetVehicleRequest } from "@/lib/fleet/client";
import { VEHICLE_STATUSES, type FleetVehicle, type VehicleStatus } from "@/lib/fleet/types";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface EditVehicleModalProps {
  vehicle: FleetVehicle | null;
  onClose: () => void;
  onUpdated: (vehicle: FleetVehicle) => void;
}

export function EditVehicleModal({
  vehicle,
  onClose,
  onUpdated,
}: EditVehicleModalProps): ReactNode {
  const { t } = useLocale();
  const [plateNumber, setPlateNumber] = useState("");
  const [model, setModel] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [capacityKg, setCapacityKg] = useState("");
  const [status, setStatus] = useState<VehicleStatus>("ACTIVE");
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [types, setTypes] = useState<CatalogVehicleType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!vehicle) {
      return;
    }

    setPlateNumber(vehicle.plateNumber);
    setModel(vehicle.model);
    setVehicleTypeId(vehicle.vehicleTypeId ?? "");
    setZoneId(vehicle.zoneId ?? "");
    setCapacityKg(String(vehicle.capacityKg));
    setStatus(vehicle.status);
    setError(null);
    setWorking(false);

    void fetchCatalogLists().then((catalog) => {
      const nextZones = catalog?.zones ?? [];
      const nextTypes = catalog?.vehicleTypes ?? [];
      setZones(nextZones);
      setTypes(nextTypes);
      if (!vehicle.vehicleTypeId && nextTypes[0]) {
        setVehicleTypeId(nextTypes[0].id);
      }
      if (!vehicle.zoneId && nextZones[0]) {
        setZoneId(nextZones[0].id);
      }
    });
  }, [vehicle]);

  const visibleTypes = types.filter(
    (row) => row.active || row.id === vehicle?.vehicleTypeId,
  );
  const visibleZones = zones.filter((row) => row.active || row.id === vehicle?.zoneId);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!vehicle) {
      return;
    }

    setWorking(true);
    setError(null);

    const capacity = Number.parseFloat(capacityKg);
    const result = await updateFleetVehicleRequest(vehicle.id, {
      plateNumber,
      model,
      vehicleTypeId,
      zoneId,
      status,
      capacityKg: Number.isFinite(capacity) ? capacity : undefined,
    });

    setWorking(false);

    if (!result.ok) {
      const key = fleetErrorMessage(result.error);
      setError(key.startsWith("fleet.") ? t(key) : result.error);
      return;
    }

    onUpdated(result.vehicle);
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
            aria-labelledby="edit-vehicle-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md"
          >
            <GlassCard hover={false}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Pencil className="size-4" />
                  </span>
                  <div>
                    <h2 id="edit-vehicle-title" className="text-sm font-semibold">
                      {t("fleet.editTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground">{t("fleet.editHint")}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={t("common.cancel")} onPress={onClose}>
                  <X />
                </Button>
              </div>

              <form className="mt-4 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("fleet.plate")}</span>
                  <input
                    required
                    className={fieldClass}
                    value={plateNumber}
                    onChange={(event) => setPlateNumber(event.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("fleet.model")}</span>
                  <input
                    required
                    className={fieldClass}
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">{t("fleet.vehicleType")}</span>
                    <select
                      required
                      className={fieldClass}
                      value={vehicleTypeId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        setVehicleTypeId(nextId);
                        const selected = types.find((row) => row.id === nextId);
                        if (selected) {
                          setCapacityKg(String(selected.maxWeightKg));
                        }
                      }}
                    >
                      {visibleTypes.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">{t("fleet.capacity")}</span>
                    <input
                      required
                      type="number"
                      min={1}
                      step="1"
                      className={fieldClass}
                      value={capacityKg}
                      onChange={(event) => setCapacityKg(event.target.value)}
                    />
                  </label>
                </div>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("fleet.zone")}</span>
                  <select
                    required
                    className={fieldClass}
                    value={zoneId}
                    onChange={(event) => setZoneId(event.target.value)}
                  >
                    {visibleZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} · {zone.city}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("fleet.changeStatus")}</span>
                  <select
                    required
                    className={fieldClass}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as VehicleStatus)}
                  >
                    {VEHICLE_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {t(`status.vehicle.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <Button type="submit" isDisabled={working}>
                    {working ? t("fleet.saving") : t("common.save")}
                  </Button>
                  <Button type="button" variant="ghost" onPress={onClose}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
