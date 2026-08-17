"use client";

import { AnimatePresence, m } from "framer-motion";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createZoneRequest,
  deleteZoneRequest,
  updateZoneRequest,
} from "@/lib/catalog/client";
import type { DeliveryZone } from "@/lib/catalog/types";
import { makeZoneCode } from "@/lib/catalog/zone-code";
import { useToastStore } from "@/stores/toast-store";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface ZoneForm {
  name: string;
  city: string;
  active: boolean;
}

const emptyForm: ZoneForm = { name: "", city: "", active: true };

export function ZonesBoard({
  initialZones,
  error,
}: {
  initialZones: DeliveryZone[];
  error?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const [zones, setZones] = useState(initialZones);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const closeForm = (): void => {
    setCreating(false);
    setEditingId(null);
    setFormError(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setWorking(true);
    setFormError(null);

    const result = creating
      ? await createZoneRequest(form)
      : editingId
        ? await updateZoneRequest(editingId, form)
        : { ok: false as const, error: "Missing zone." };

    setWorking(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setZones((current) => {
      if (creating) {
        return [...current, result.item].sort((left, right) => left.name.localeCompare(right.name));
      }
      return current.map((zone) => (zone.id === result.item.id ? result.item : zone));
    });
    useToastStore.getState().push({ kind: "synced", count: 1 });
    closeForm();
  };

  const toggleActive = async (zone: DeliveryZone): Promise<void> => {
    const result = await updateZoneRequest(zone.id, { active: !zone.active });
    if (!result.ok) {
      useToastStore.getState().push({ kind: "error" });
      return;
    }
    setZones((current) => current.map((row) => (row.id === result.item.id ? result.item : row)));
  };

  const onDelete = async (id: string): Promise<void> => {
    if (!window.confirm(t("catalog.confirmDeleteZone"))) {
      return;
    }
    const result = await deleteZoneRequest(id);
    if (!result.ok) {
      useToastStore.getState().push({ kind: "error" });
      return;
    }
    setZones((current) => current.filter((zone) => zone.id !== id));
  };

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("catalog.zonesTitle")}
          description={t("catalog.zonesDescription")}
          action={
            <Button
              onPress={() => {
                setCreating(true);
                setEditingId(null);
                setForm(emptyForm);
                setFormError(null);
              }}
            >
              <Plus data-icon="inline-start" />
              {t("catalog.addZone")}
            </Button>
          }
        />
      </FadeIn>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <AnimatePresence>
        {showForm ? (
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <GlassCard hover={false}>
              <h2 className="text-sm font-semibold">
                {creating ? t("catalog.addZone") : t("catalog.editZone")}
              </h2>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("catalog.city")}</span>
                  <input
                    required
                    className={fieldClass}
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("catalog.name")}</span>
                  <input
                    required
                    className={fieldClass}
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">{t("catalog.code")}</span>
                  <input
                    readOnly
                    className={`${fieldClass} font-mono uppercase tracking-[0.18em] text-muted-foreground`}
                    value={
                      form.city.trim() && form.name.trim()
                        ? makeZoneCode(form.city, form.name)
                        : ""
                    }
                    placeholder="AMSH"
                  />
                  <p className="text-[11px] text-muted-foreground">{t("catalog.codeAuto")}</p>
                </label>
                {formError ? (
                  <p className="text-sm text-destructive sm:col-span-2" role="alert">
                    {formError}
                  </p>
                ) : null}
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" isDisabled={working}>
                    {t("common.save")}
                  </Button>
                  <Button type="button" variant="ghost" onPress={closeForm}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </m.div>
        ) : null}
      </AnimatePresence>

      <GlassCard hover={false} className="overflow-hidden p-0">
        {zones.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">{t("catalog.zonesEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border/70 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-start font-medium">{t("catalog.name")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("catalog.code")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("catalog.city")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("catalog.status")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("orders.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{zone.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("catalog.vehicleCount", { count: zone.vehicleCount })}
                      </p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{zone.code}</td>
                    <td className="px-5 py-3">{zone.city}</td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={zone.active ? t("catalog.active") : t("catalog.inactive")}
                        tone={zone.active ? "success" : "muted"}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("catalog.editZone")}
                          onPress={() => {
                            setCreating(false);
                            setEditingId(zone.id);
                            setForm({
                              name: zone.name,
                              city: zone.city,
                              active: zone.active,
                            });
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("catalog.toggle")}
                          onPress={() => {
                            void toggleActive(zone);
                          }}
                        >
                          <Power />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("common.delete")}
                          onPress={() => {
                            void onDelete(zone.id);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
