"use client";

import { m } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AddVehicleModal } from "@/components/fleet/AddVehicleModal";
import { DeleteVehicleModal } from "@/components/fleet/DeleteVehicleModal";
import { EditVehicleModal } from "@/components/fleet/EditVehicleModal";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { fetchCatalogLists } from "@/lib/catalog/client";
import type { DeliveryZone } from "@/lib/catalog/types";
import { fleetErrorMessage, updateFleetVehicleRequest } from "@/lib/fleet/client";
import {
  VEHICLE_STATUSES,
  type FleetVehicle,
  type VehicleDeleteResult,
  type VehicleStatus,
} from "@/lib/fleet/types";
import { useToastStore } from "@/stores/toast-store";

const vehicleTone: Record<VehicleStatus, BadgeTone> = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  INACTIVE: "muted",
};

function LoadMeter({ pct }: { pct: number }): ReactNode {
  const clamped = Math.min(100, Math.max(0, pct)) / 100;

  return (
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
      <m.div
        className="h-full origin-start rounded-full bg-primary"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: clamped }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function sortVehicles(vehicles: FleetVehicle[]): FleetVehicle[] {
  return [...vehicles].sort((left, right) => {
    const statusOrder = VEHICLE_STATUSES.indexOf(left.status) - VEHICLE_STATUSES.indexOf(right.status);
    if (statusOrder !== 0) {
      return statusOrder;
    }
    return left.plateNumber.localeCompare(right.plateNumber);
  });
}

export function FleetBoard({
  initialVehicles,
  error,
}: {
  initialVehicles: FleetVehicle[];
  error?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FleetVehicle | null>(null);
  const [deleting, setDeleting] = useState<FleetVehicle | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetchCatalogLists(true).then((catalog) => {
      setZones(catalog?.zones ?? []);
    });
  }, []);

  const upsertVehicle = (vehicle: FleetVehicle): void => {
    setVehicles((current) =>
      sortVehicles(current.map((item) => (item.id === vehicle.id ? vehicle : item))),
    );
  };

  const changeStatus = async (vehicle: FleetVehicle, status: VehicleStatus): Promise<void> => {
    if (status === vehicle.status) {
      return;
    }

    setBusyId(vehicle.id);
    setActionError(null);
    setNotice(null);
    const result = await updateFleetVehicleRequest(vehicle.id, { status });
    setBusyId(null);

    if (!result.ok) {
      const key = fleetErrorMessage(result.error);
      setActionError(key.startsWith("fleet.") ? t(key) : result.error);
      useToastStore.getState().push({ kind: "error" });
      return;
    }

    upsertVehicle(result.vehicle);
    useToastStore.getState().push({ kind: "synced", count: 1 });
  };

  const changeZone = async (vehicle: FleetVehicle, zoneId: string): Promise<void> => {
    if (!zoneId || zoneId === vehicle.zoneId) {
      return;
    }

    setBusyId(vehicle.id);
    setActionError(null);
    setNotice(null);
    const result = await updateFleetVehicleRequest(vehicle.id, { zoneId });
    setBusyId(null);

    if (!result.ok) {
      const key = fleetErrorMessage(result.error);
      setActionError(key.startsWith("fleet.") ? t(key) : result.error);
      useToastStore.getState().push({ kind: "error" });
      return;
    }

    upsertVehicle(result.vehicle);
  };

  const onDeleted = (result: VehicleDeleteResult): void => {
    setActionError(null);
    if (result.deleted) {
      setVehicles((current) => current.filter((item) => item.id !== result.id));
      setNotice(t("fleet.deleted"));
      useToastStore.getState().push({ kind: "synced", count: 1 });
      return;
    }

    if (result.vehicle) {
      upsertVehicle(result.vehicle);
    }
    setNotice(t("fleet.deactivated"));
    useToastStore.getState().push({ kind: "synced", count: 1 });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("fleet.title")}
          description={t("fleet.description")}
          action={
            <Button onPress={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              {t("fleet.add")}
            </Button>
          }
        />
      </FadeIn>

      <AddVehicleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(vehicle) => {
          setVehicles((current) => sortVehicles([...current, vehicle]));
          useToastStore.getState().push({ kind: "synced", count: 1 });
        }}
      />
      <EditVehicleModal
        vehicle={editing}
        onClose={() => setEditing(null)}
        onUpdated={(vehicle) => {
          upsertVehicle(vehicle);
          useToastStore.getState().push({ kind: "synced", count: 1 });
        }}
      />
      <DeleteVehicleModal
        vehicle={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onDeleted}
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {vehicles.length === 0 && !error ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("fleet.empty")}</p>
        </GlassCard>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <StaggerItem key={vehicle.id}>
              <GlassCard>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold">{vehicle.plateNumber}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {vehicle.driver?.name ?? t("common.unassigned")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge
                      label={t(`status.vehicle.${vehicle.status}`)}
                      tone={vehicleTone[vehicle.status]}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("fleet.edit")}
                      isDisabled={busyId === vehicle.id}
                      onPress={() => setEditing(vehicle)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("fleet.delete")}
                      isDisabled={busyId === vehicle.id}
                      onPress={() => setDeleting(vehicle)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("fleet.model")}</dt>
                    <dd className="mt-1 font-medium">{vehicle.model}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("fleet.type")}</dt>
                    <dd className="mt-1 font-medium">{vehicle.type}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("fleet.zone")}</dt>
                    <dd className="mt-1">
                      {zones.length > 0 ? (
                        <select
                          className="h-8 w-full rounded-lg border border-border bg-background/70 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          value={vehicle.zoneId ?? ""}
                          disabled={busyId === vehicle.id}
                          onChange={(event) => {
                            void changeZone(vehicle, event.target.value);
                          }}
                        >
                          {vehicle.zoneId ? null : (
                            <option value="">{vehicle.zoneName}</option>
                          )}
                          {zones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium">{vehicle.zoneName}</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("fleet.load")}</dt>
                    <dd className="mt-1 font-mono text-sm">
                      {Math.round(vehicle.currentLoadPct)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("fleet.capacity")}</dt>
                    <dd className="mt-1 font-mono text-sm">{vehicle.capacityKg} kg</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("fleet.driver")}</dt>
                    <dd className="mt-1 text-sm">
                      {vehicle.driver
                        ? t(`status.driver.${vehicle.driver.status}`)
                        : t("common.unassigned")}
                    </dd>
                  </div>
                </dl>
                <LoadMeter pct={vehicle.currentLoadPct} />
                <label className="mt-4 block space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("fleet.changeStatus")}</span>
                  <select
                    className="h-8 w-full rounded-lg border border-border bg-background/70 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={vehicle.status}
                    disabled={busyId === vehicle.id}
                    onChange={(event) => {
                      void changeStatus(vehicle, event.target.value as VehicleStatus);
                    }}
                  >
                    {VEHICLE_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {t(`status.vehicle.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
