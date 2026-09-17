"use client";

import { MapPin, Navigation, QrCode, Store, Truck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MenuQrModal, type MenuQrTarget } from "@/components/stores/menu-qr-modal";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/auth/constants";
import { osmEmbedUrl } from "@/lib/geo";
import {
  createDriverAction,
  createOwnerAction,
  deleteStoreAction,
  saveStoreAction,
} from "@/lib/stores/actions";
import type {
  StoreDriverOption,
  StoreOwnerOption,
  StoreRecord,
  StoreTypeRecord,
} from "@/lib/stores/types";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Tab = "stores" | "owners" | "drivers";

export function AdminStoresBoard({
  stores,
  owners,
  drivers,
  storeTypes,
}: {
  stores: StoreRecord[];
  owners: StoreOwnerOption[];
  drivers: StoreDriverOption[];
  storeTypes: StoreTypeRecord[];
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stores");
  const [editing, setEditing] = useState<StoreRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [qrTarget, setQrTarget] = useState<MenuQrTarget | null>(null);

  const refresh = (): void => {
    router.refresh();
    setCreating(false);
    setEditing(null);
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("stores.title")}
        description={t("stores.description")}
        action={
          tab === "stores" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onPress={() =>
                  setQrTarget({
                    title: t("stores.allStoresQr"),
                    filename: "menu-qr.png",
                    path: "/menu",
                  })
                }
              >
                <QrCode data-icon="inline-start" />
                {t("stores.menuQr")}
              </Button>
              <Link
                href="/admin/store-types"
                className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium"
              >
                {t("stores.manageTypes")}
              </Link>
              <Button
                onPress={() => {
                  setCreating(true);
                  setEditing(null);
                }}
              >
                <Store data-icon="inline-start" />
                {t("stores.addStore")}
              </Button>
            </div>
          ) : null
        }
      />

      <GlassCard hover={false}>
        <p className="text-sm font-medium">{t("stores.demoAccounts")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("stores.demoAccountsHint")}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-xs">{account.email}</span>
              <span className="text-xs text-muted-foreground">{t(`roles.${account.role}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("stores.demoPassword")}: <span className="font-mono text-foreground">{DEMO_PASSWORD}</span>
        </p>
      </GlassCard>

      <div className="flex flex-wrap gap-2">
        {(["stores", "owners", "drivers"] as const).map((item) => (
          <Button
            key={item}
            variant={tab === item ? "default" : "outline"}
            onPress={() => setTab(item)}
          >
            {t(`stores.tab${item[0].toUpperCase()}${item.slice(1)}`)}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {tab === "stores" ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {stores.length === 0 ? (
              <GlassCard hover={false}>
                <p className="text-sm text-muted-foreground">{t("stores.empty")}</p>
              </GlassCard>
            ) : (
              stores.map((store) => (
                <GlassCard key={store.id} hover={false} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{store.name}</h2>
                      <StatusBadge
                        label={store.storeType.name}
                        tone="info"
                      />
                      <StatusBadge
                        label={store.active ? t("catalog.active") : t("catalog.inactive")}
                        tone={store.active ? "success" : "muted"}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {store.owner?.name ?? t("stores.noOwner")} · {t("stores.catalog", {
                        categories: store.categoryCount,
                        products: store.productCount,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onPress={() =>
                        setQrTarget({
                          title: store.name,
                          filename: `menu-${store.slug || store.id}.png`,
                          path: `/menu/stores/${store.id}`,
                        })
                      }
                    >
                      <QrCode data-icon="inline-start" />
                      {t("stores.storeMenuQr")}
                    </Button>
                    <Button variant="outline" onPress={() => { setEditing(store); setCreating(false); }}>
                      {t("common.edit")}
                    </Button>
                    <form
                      action={(formData) => {
                        startTransition(async () => {
                          const result = await deleteStoreAction(formData);
                          if (!result.ok) {
                            setError(result.error ?? "Failed.");
                            return;
                          }
                          refresh();
                        });
                      }}
                    >
                      <input type="hidden" name="id" value={store.id} />
                      <Button variant="destructive" type="submit" isDisabled={pending}>
                        {t("common.delete")}
                      </Button>
                    </form>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
          {creating || editing ? (
            <StoreForm
              store={editing}
              owners={owners}
              storeTypes={storeTypes}
              pending={pending}
              onCancel={() => { setCreating(false); setEditing(null); }}
              onSubmit={(formData) => {
                startTransition(async () => {
                  const result = await saveStoreAction(formData);
                  if (!result.ok) {
                    setError(result.error ?? "Failed.");
                    return;
                  }
                  setError(null);
                  refresh();
                });
              }}
            />
          ) : null}
        </div>
      ) : null}

      {tab === "owners" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard hover={false} className="space-y-3">
            {owners.map((owner) => (
              <div key={owner.id} className="rounded-xl border border-border/70 px-3 py-2">
                <p className="font-medium">{owner.name}</p>
                <p className="text-xs text-muted-foreground">{owner.email} · {owner.phone}</p>
              </div>
            ))}
          </GlassCard>
          <PersonForm
            title={t("stores.addOwner")}
            action={(formData) => {
              startTransition(async () => {
                const result = await createOwnerAction(formData);
                if (!result.ok) {
                  setError(result.error ?? "Failed.");
                  return;
                }
                setError(null);
                refresh();
              });
            }}
            pending={pending}
            icon={<UserPlus className="size-4" />}
          />
        </div>
      ) : null}

      {tab === "drivers" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard hover={false} className="space-y-3">
            {drivers.map((driver) => (
              <div key={driver.id} className="rounded-xl border border-border/70 px-3 py-2">
                <p className="font-medium">{driver.name}</p>
                <p className="text-xs text-muted-foreground">
                  {driver.phone} · {driver.vehicleType} · {driver.status}
                </p>
              </div>
            ))}
          </GlassCard>
          <PersonForm
            title={t("stores.addDriver")}
            action={(formData) => {
              startTransition(async () => {
                const result = await createDriverAction(formData);
                if (!result.ok) {
                  setError(result.error ?? "Failed.");
                  return;
                }
                setError(null);
                refresh();
              });
            }}
            pending={pending}
            showVehicle
            icon={<Truck className="size-4" />}
          />
        </div>
      ) : null}

      <MenuQrModal target={qrTarget} onClose={() => setQrTarget(null)} />
    </FadeIn>
  );
}

function StoreForm({
  store,
  owners,
  storeTypes,
  pending,
  onSubmit,
  onCancel,
}: {
  store: StoreRecord | null;
  owners: StoreOwnerOption[];
  storeTypes: StoreTypeRecord[];
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}): ReactNode {
  const { t } = useLocale();
  const [latitude, setLatitude] = useState(store?.latitude != null ? String(store.latitude) : "");
  const [longitude, setLongitude] = useState(store?.longitude != null ? String(store.longitude) : "");
  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);
  const coordsReady = Number.isFinite(lat) && Number.isFinite(lng);

  const fillGps = (): void => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      setLatitude(String(position.coords.latitude));
      setLongitude(String(position.coords.longitude));
    });
  };

  return (
    <GlassCard hover={false}>
      <h2 className="mb-4 font-medium">{store ? t("stores.editStore") : t("stores.addStore")}</h2>
      <form action={onSubmit} className="space-y-3">
        {store ? <input type="hidden" name="id" value={store.id} /> : null}
        <Field label={t("stores.name")} name="name" defaultValue={store?.name ?? ""} required />
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("stores.type")}
          <select name="storeTypeId" defaultValue={store?.storeTypeId ?? storeTypes[0]?.id ?? ""} className={fieldClass} required>
            {storeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <Field label={t("stores.phone")} name="phone" defaultValue={store?.phone ?? ""} />
        <Field label={t("stores.city")} name="city" defaultValue={store?.city ?? ""} />
        <Field label={t("stores.address")} name="address" defaultValue={store?.address ?? ""} />
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("stores.logo")}
          {store?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt="" className="mb-2 size-14 rounded-full object-cover" />
          ) : null}
          <input type="file" name="logo" accept="image/jpeg,image/png,image/webp,image/gif" className={fieldClass} />
          <input type="hidden" name="logoUrl" value={store?.logoUrl ?? ""} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("stores.coverImage")}
          {store?.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.coverImage} alt="" className="mb-2 h-28 w-full rounded-2xl object-cover" />
          ) : null}
          <input type="file" name="cover" accept="image/jpeg,image/png,image/webp,image/gif" className={fieldClass} />
          <input type="hidden" name="coverImage" value={store?.coverImage ?? ""} />
        </label>
        <Field
          label={t("stores.rating")}
          name="rating"
          defaultValue={store ? String(store.rating) : "0"}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t("stores.latitude")}
            <input
              name="latitude"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t("stores.longitude")}
            <input
              name="longitude"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <Button variant="outline" type="button" onPress={fillGps}>
          <Navigation className="size-3.5" />
          {t("stores.useMapLocation")}
        </Button>
        <div className="overflow-hidden rounded-2xl border border-border/70">
          {coordsReady ? (
            <iframe
              title={t("menu.mapPreview")}
              src={osmEmbedUrl(lat, lng)}
              className="h-40 w-full border-0"
              loading="lazy"
            />
          ) : (
            <div className="flex h-28 items-center justify-center gap-2 bg-muted/60 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {t("stores.mapHint")}
            </div>
          )}
        </div>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("stores.owner")}
          <select name="ownerId" defaultValue={store?.ownerId ?? ""} className={fieldClass}>
            <option value="">{t("stores.noOwner")}</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={store?.active ?? true} />
          {t("stores.active")}
        </label>
        <div className="flex gap-2">
          <Button type="submit" isDisabled={pending}>{t("common.save")}</Button>
          <Button variant="outline" type="button" onPress={onCancel}>{t("common.cancel")}</Button>
        </div>
      </form>
    </GlassCard>
  );
}

function PersonForm({
  title,
  action,
  pending,
  showVehicle = false,
  icon,
}: {
  title: string;
  action: (formData: FormData) => void;
  pending: boolean;
  showVehicle?: boolean;
  icon: ReactNode;
}): ReactNode {
  const { t } = useLocale();
  return (
    <GlassCard hover={false}>
      <h2 className="mb-4 flex items-center gap-2 font-medium">{icon}{title}</h2>
      <form action={action} className="space-y-3">
        <Field label={t("stores.name")} name="name" required />
        <Field label={t("stores.email")} name="email" required />
        <Field label={t("stores.phone")} name="phone" required />
        {showVehicle ? <Field label={t("stores.vehicleType")} name="vehicleType" defaultValue="Van" /> : null}
        <Field label={t("stores.password")} name="password" />
        <Button type="submit" isDisabled={pending}>{t("common.add")}</Button>
      </form>
    </GlassCard>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}): ReactNode {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <input name={name} defaultValue={defaultValue} required={required} className={fieldClass} />
    </label>
  );
}
