"use client";

import { AnimatePresence, m } from "framer-motion";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { AddVehicleModal } from "@/components/fleet/AddVehicleModal";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import type { SessionRole } from "@/lib/auth/constants";
import { fetchCatalogLists } from "@/lib/catalog/client";
import type { CatalogVehicleType } from "@/lib/catalog/types";
import { fetchFleetVehicles } from "@/lib/fleet/client";
import type { FleetVehicle } from "@/lib/fleet/types";
import {
  createManagedUserRequest,
  deleteManagedUserRequest,
  updateManagedUserRequest,
} from "@/lib/users/client";
import { USER_ROLES, type ManagedUser } from "@/lib/users/types";
import { useToastStore } from "@/stores/toast-store";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const roleTone: Record<SessionRole, BadgeTone> = {
  ADMIN: "destructive",
  DISPATCHER: "info",
  DRIVER: "success",
};

interface UserFormState {
  name: string;
  email: string;
  phone: string;
  role: SessionRole;
  language: string;
  password: string;
  vehicleType: string;
  vehicleId: string;
}

const emptyForm: UserFormState = {
  name: "",
  email: "",
  phone: "",
  role: "DISPATCHER",
  language: "ar",
  password: "",
  vehicleType: "",
  vehicleId: "",
};

function formFromUser(user: ManagedUser): UserFormState {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    language: user.language,
    password: "",
    vehicleType: user.driver?.vehicleType ?? "",
    vehicleId: user.driver?.vehicle?.id ?? "",
  };
}

export function UsersBoard({
  initialUsers,
  initialVehicles,
  error,
}: {
  initialUsers: ManagedUser[];
  initialVehicles: FleetVehicle[];
  error?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const [users, setUsers] = useState(initialUsers);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [catalogTypes, setCatalogTypes] = useState<CatalogVehicleType[]>([]);

  useEffect(() => {
    void fetchCatalogLists(true).then((catalog) => {
      const nextTypes = catalog?.vehicleTypes ?? [];
      setCatalogTypes(nextTypes);
      setForm((current) =>
        current.vehicleType || nextTypes.length === 0
          ? current
          : { ...current, vehicleType: nextTypes[0].name },
      );
    });
  }, []);

  const vehicleOptions = useMemo(() => {
    const assignedToCurrent = editingId
      ? users.find((user) => user.id === editingId)?.driver?.vehicle?.id
      : null;

    return vehicles.filter(
      (vehicle) => !vehicle.driver || vehicle.id === assignedToCurrent || vehicle.id === form.vehicleId,
    );
  }, [editingId, form.vehicleId, users, vehicles]);

  const openCreate = (): void => {
    setCreating(true);
    setEditingId(null);
    setForm({
      ...emptyForm,
      vehicleType: catalogTypes[0]?.name ?? "",
    });
    setFormError(null);
  };

  const openEdit = (user: ManagedUser): void => {
    setCreating(false);
    setEditingId(user.id);
    setForm(formFromUser(user));
    setFormError(null);
  };

  const closeForm = (): void => {
    setCreating(false);
    setEditingId(null);
    setFormError(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setWorking(true);
    setFormError(null);

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      language: form.language,
      password: form.password || undefined,
      vehicleType: form.role === "DRIVER" ? form.vehicleType : undefined,
      vehicleId: form.role === "DRIVER" ? form.vehicleId || null : null,
    };

    const result = creating
      ? await createManagedUserRequest(payload)
      : editingId
        ? await updateManagedUserRequest(editingId, payload)
        : { ok: false as const, error: "Missing user." };

    setWorking(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setUsers((current) => {
      if (creating) {
        return [...current, result.user].sort((left, right) => left.name.localeCompare(right.name));
      }

      return current.map((user) => (user.id === result.user.id ? result.user : user));
    });

    const nextVehicles = await fetchFleetVehicles();
    if (nextVehicles) {
      setVehicles(nextVehicles);
    }

    useToastStore.getState().push({ kind: "synced", count: 1 });
    closeForm();
  };

  const onDelete = async (id: string): Promise<void> => {
    if (!window.confirm(t("users.confirmDelete"))) {
      return;
    }

    setWorking(true);
    const result = await deleteManagedUserRequest(id);
    setWorking(false);

    if (!result.ok) {
      useToastStore.getState().push({ kind: "error" });
      return;
    }

    setUsers((current) => current.filter((user) => user.id !== id));
    if (editingId === id) {
      closeForm();
    }
  };

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("users.title")}
          description={t("users.description")}
          action={
            <Button onPress={openCreate}>
              <Plus data-icon="inline-start" />
              {t("users.add")}
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
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <GlassCard hover={false}>
              <h2 className="text-sm font-semibold">
                {creating ? t("users.add") : t("users.edit")}
              </h2>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("users.name")}</span>
                  <input
                    required
                    className={fieldClass}
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("users.email")}</span>
                  <input
                    required
                    type="email"
                    className={fieldClass}
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("users.phone")}</span>
                  <input
                    required
                    className={fieldClass}
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("users.role")}</span>
                  <select
                    className={fieldClass}
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value as SessionRole,
                      }))
                    }
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {t(`status.role.${role}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("users.language")}</span>
                  <select
                    className={fieldClass}
                    value={form.language}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, language: event.target.value }))
                    }
                  >
                    <option value="ar">{t("common.arabic")}</option>
                    <option value="en">{t("common.english")}</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">{t("users.password")}</span>
                  <input
                    type="password"
                    className={fieldClass}
                    placeholder={creating ? undefined : t("users.passwordHint")}
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </label>
                {form.role === "DRIVER" ? (
                  <>
                    <label className="space-y-1.5 sm:col-span-2">
                      <span className="text-xs text-muted-foreground">{t("fleet.vehicleType")}</span>
                      <select
                        className={fieldClass}
                        value={form.vehicleType}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, vehicleType: event.target.value }))
                        }
                      >
                        {form.vehicleType &&
                        !catalogTypes.some((row) => row.name === form.vehicleType) ? (
                          <option value={form.vehicleType}>{form.vehicleType}</option>
                        ) : null}
                        {catalogTypes.map((row) => (
                          <option key={row.id} value={row.name}>
                            {row.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="space-y-1.5 sm:col-span-2">
                      <span className="text-xs text-muted-foreground">{t("users.vehicle")}</span>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          className={`${fieldClass} min-w-0 flex-1`}
                          value={form.vehicleId}
                          onChange={(event) => {
                            const vehicleId = event.target.value;
                            const selected = vehicles.find((item) => item.id === vehicleId);
                            setForm((current) => ({
                              ...current,
                              vehicleId,
                              vehicleType: selected?.type ?? current.vehicleType,
                            }));
                          }}
                        >
                          <option value="">{t("users.unassigned")}</option>
                          {vehicleOptions.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.plateNumber} · {vehicle.type} · {vehicle.zoneName}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          onPress={() => setVehicleModalOpen(true)}
                        >
                          <Plus data-icon="inline-start" />
                          {t("users.newVehicle")}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("users.vehicleHint")}</p>
                    </div>
                  </>
                ) : null}

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

      <AddVehicleModal
        open={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        onCreated={(vehicle) => {
          setVehicles((current) => [...current, vehicle]);
          setForm((current) => ({
            ...current,
            vehicleId: vehicle.id,
            vehicleType: vehicle.type,
          }));
        }}
      />

      <GlassCard hover={false} className="overflow-hidden p-0">
        {users.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
            <Users className="size-4" />
            {t("users.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border/70 text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t("users.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("users.role")}</th>
                  <th className="px-5 py-3 font-medium">{t("users.email")}</th>
                  <th className="px-5 py-3 font-medium">{t("users.vehicle")}</th>
                  <th className="px-5 py-3 font-medium">{t("orders.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={t(`status.role.${user.role}`)}
                        tone={roleTone[user.role]}
                      />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{user.email}</td>
                    <td className="px-5 py-3">
      {user.driver?.vehicle
                        ? `${user.driver.vehicle.plateNumber} · ${user.driver.vehicleType}`
                        : t("common.unassigned")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("users.edit")}
                          onPress={() => openEdit(user)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("common.delete")}
                          isDisabled={working}
                          onPress={() => {
                            void onDelete(user.id);
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
