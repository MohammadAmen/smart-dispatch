"use client";

import { AnimatePresence, m } from "framer-motion";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { CatalogIcon } from "@/components/catalog/catalog-icon";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createVehicleTypeRequest,
  deleteVehicleTypeRequest,
  updateVehicleTypeRequest,
} from "@/lib/catalog/client";
import { CATALOG_ICONS, type CatalogVehicleType } from "@/lib/catalog/types";
import { useToastStore } from "@/stores/toast-store";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface TypeForm {
  name: string;
  maxWeightKg: string;
  icon: string;
  active: boolean;
}

const emptyForm: TypeForm = { name: "", maxWeightKg: "900", icon: "truck", active: true };

export function VehicleTypesBoard({
  initialTypes,
  error,
}: {
  initialTypes: CatalogVehicleType[];
  error?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const [types, setTypes] = useState(initialTypes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TypeForm>(emptyForm);
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
    const maxWeightKg = Number.parseFloat(form.maxWeightKg);
    const payload = {
      name: form.name,
      icon: form.icon,
      maxWeightKg: Number.isFinite(maxWeightKg) ? maxWeightKg : 0,
      active: form.active,
    };

    const result = creating
      ? await createVehicleTypeRequest(payload)
      : editingId
        ? await updateVehicleTypeRequest(editingId, payload)
        : { ok: false as const, error: "Missing type." };

    setWorking(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setTypes((current) => {
      if (creating) {
        return [...current, result.item].sort((left, right) => left.name.localeCompare(right.name));
      }
      return current.map((row) => (row.id === result.item.id ? result.item : row));
    });
    useToastStore.getState().push({ kind: "synced", count: 1 });
    closeForm();
  };

  const toggleActive = async (row: CatalogVehicleType): Promise<void> => {
    const result = await updateVehicleTypeRequest(row.id, { active: !row.active });
    if (!result.ok) {
      useToastStore.getState().push({ kind: "error" });
      return;
    }
    setTypes((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
  };

  const onDelete = async (id: string): Promise<void> => {
    if (!window.confirm(t("catalog.confirmDeleteType"))) {
      return;
    }
    const result = await deleteVehicleTypeRequest(id);
    if (!result.ok) {
      useToastStore.getState().push({ kind: "error" });
      return;
    }
    setTypes((current) => current.filter((row) => row.id !== id));
  };

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("catalog.typesTitle")}
          description={t("catalog.typesDescription")}
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
              {t("catalog.addType")}
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
                {creating ? t("catalog.addType") : t("catalog.editType")}
              </h2>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("catalog.name")}</span>
                  <input
                    required
                    className={fieldClass}
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("catalog.maxWeight")}</span>
                  <input
                    required
                    type="number"
                    min={1}
                    className={fieldClass}
                    value={form.maxWeightKg}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxWeightKg: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">{t("catalog.icon")}</span>
                  <select
                    className={fieldClass}
                    value={form.icon}
                    onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                  >
                    {CATALOG_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {t(`catalog.icons.${icon}`)}
                      </option>
                    ))}
                  </select>
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
        {types.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">{t("catalog.typesEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border/70 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-start font-medium">{t("catalog.name")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("catalog.maxWeight")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("catalog.status")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("orders.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {types.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
                          <CatalogIcon name={row.icon} />
                        </span>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("catalog.vehicleCount", { count: row.vehicleCount })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono">{row.maxWeightKg} kg</td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={row.active ? t("catalog.active") : t("catalog.inactive")}
                        tone={row.active ? "success" : "muted"}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("catalog.editType")}
                          onPress={() => {
                            setCreating(false);
                            setEditingId(row.id);
                            setForm({
                              name: row.name,
                              maxWeightKg: String(row.maxWeightKg),
                              icon: row.icon,
                              active: row.active,
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
                            void toggleActive(row);
                          }}
                        >
                          <Power />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("common.delete")}
                          onPress={() => {
                            void onDelete(row.id);
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
