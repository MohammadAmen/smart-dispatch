"use client";

import { Clock3, Megaphone, Pencil, Plus, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteOfferAction, saveOfferAction } from "@/lib/stores/actions";
import type { OfferDraft } from "@/lib/stores/offer-draft";
import {
  formatCountdown,
  offerBucket,
  remainingMs,
  type OfferDiscountType,
  type OfferRecord,
} from "@/lib/stores/offer-types";
import type { CategoryRecord, ProductRecord, StoreRecord } from "@/lib/stores/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const DURATION_PRESETS = [30, 60, 180, 360, 720, 1440] as const;

type DurationMode = "duration" | "exact";
type OfferTab = "live" | "scheduled" | "ended";

function toLocalInput(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function VendorOffersBoard({
  store,
  categories,
  products,
  offers,
  draftOffer = null,
}: {
  store: StoreRecord | null;
  categories: CategoryRecord[];
  products: ProductRecord[];
  offers: OfferRecord[];
  draftOffer?: OfferDraft | null;
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<OfferTab>("live");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<OfferRecord | null>(null);
  const [creating, setCreating] = useState(Boolean(draftOffer));
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const now = Date.now();
    const buckets: Record<OfferTab, OfferRecord[]> = { live: [], scheduled: [], ended: [] };
    for (const offer of offers) {
      buckets[offerBucket(offer, now)].push(offer);
    }
    return buckets;
  }, [offers]);

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.offers")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, close = false): void => {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      if (close) {
        setEditing(null);
        setCreating(false);
      }
      router.refresh();
    });
  };

  const visible = grouped[tab];
  const formOffer = creating ? null : editing;

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("vendor.offers")}
        description={t("vendor.offersDesc")}
        action={
          <Button
            onPress={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            <Plus data-icon="inline-start" />
            {t("vendor.addOffer")}
          </Button>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {creating || editing ? (
        <OfferForm
          storeId={store.id}
          offer={formOffer}
          draft={creating && !editing ? draftOffer : null}
          categories={categories}
          products={products}
          pending={pending}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(formData) => run(() => saveOfferAction(formData), true)}
        />
      ) : null}

      <div className="flex gap-2">
        {(["live", "scheduled", "ended"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === key ? "bg-primary text-primary-foreground" : "bg-muted/70 text-muted-foreground",
            )}
          >
            {t(`vendor.offerTab.${key}`)} · {grouped[key].length}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("vendor.emptyOffers")}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              storeId={store.id}
              pending={pending}
              onEdit={() => {
                setEditing(offer);
                setCreating(false);
              }}
              onDelete={(formData) => run(() => deleteOfferAction(formData))}
            />
          ))}
        </div>
      )}
    </FadeIn>
  );
}

function OfferCard({
  offer,
  storeId,
  pending,
  onEdit,
  onDelete,
}: {
  offer: OfferRecord;
  storeId: string;
  pending: boolean;
  onEdit: () => void;
  onDelete: (formData: FormData) => void;
}): ReactNode {
  const { t } = useLocale();
  const bucket = offerBucket(offer);
  const tone = bucket === "live" ? "success" : bucket === "scheduled" ? "info" : "muted";
  const remaining = remainingMs(offer.endDate);

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="relative h-28 bg-muted/50">
        <MenuSafeImage
          src={offer.image}
          alt=""
          className="size-full object-cover"
          fallback={
            <span className="flex size-full items-center justify-center bg-linear-to-br from-primary/70 to-info/50 text-primary-foreground">
              <Megaphone className="size-7" />
            </span>
          }
        />
        <div className="absolute start-3 top-3">
          <StatusBadge label={t(`vendor.offerTab.${bucket}`)} tone={tone} />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="font-medium">{offer.title}</p>
          {offer.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{offer.description}</p>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-primary">
          {offer.discountType === "PERCENT"
            ? t("vendor.offerPercent", { value: offer.discountVal })
            : t("vendor.offerAmount", { value: offer.discountVal })}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {bucket === "live" ? <Timer className="size-3.5" /> : <Clock3 className="size-3.5" />}
          {bucket === "live"
            ? t("menu.offerRemaining", { time: formatCountdown(remaining) })
            : t("vendor.offerWindow")}
        </p>
        <p className="text-xs text-muted-foreground">
          {offer.productName ?? offer.categoryName ?? t("vendor.offerWholeStore")}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onPress={onEdit}>
            <Pencil className="size-3.5" />
            {t("common.edit")}
          </Button>
          <form action={onDelete}>
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="id" value={offer.id} />
            <Button variant="destructive" size="sm" type="submit" isDisabled={pending}>
              {t("common.delete")}
            </Button>
          </form>
        </div>
      </div>
    </GlassCard>
  );
}

function OfferForm({
  storeId,
  offer,
  draft,
  categories,
  products,
  pending,
  onCancel,
  onSubmit,
}: {
  storeId: string;
  offer: OfferRecord | null;
  draft: OfferDraft | null;
  categories: CategoryRecord[];
  products: ProductRecord[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}): ReactNode {
  const { t } = useLocale();
  const draftProduct = products.find((product) => product.id === draft?.productId);
  const [durationMode, setDurationMode] = useState<DurationMode>(offer ? "exact" : "duration");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [categoryId, setCategoryId] = useState(offer?.categoryId ?? draftProduct?.categoryId ?? "");
  const [discountType, setDiscountType] = useState<OfferDiscountType>(offer?.discountType ?? "PERCENT");
  const filteredProducts = products.filter((product) => !categoryId || product.categoryId === categoryId);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("durationMode", durationMode);
    formData.set("durationMinutes", String(durationMinutes));
    onSubmit(formData);
  };

  return (
    <GlassCard hover={false}>
      <h2 className="mb-4 font-medium">{offer ? t("vendor.editOffer") : t("vendor.addOffer")}</h2>
      <form onSubmit={submit} className="space-y-3">
        {offer ? <input type="hidden" name="id" value={offer.id} /> : null}
        <input type="hidden" name="storeId" value={storeId} />
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("vendor.offerTitle")}
          <input
            name="title"
            required
            defaultValue={
              offer?.title ??
              (draft
                ? t("vendor.offerFromInsight", { name: draft.productName, percent: draft.discountVal })
                : "")
            }
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("vendor.descriptionLabel")}
          <textarea
            name="description"
            defaultValue={offer?.description ?? ""}
            rows={3}
            className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("vendor.offerImage")}
          {offer?.image ? (
            <MenuSafeImage
              src={offer.image}
              alt=""
              className="mb-2 h-24 w-full rounded-2xl object-cover"
              fallback={null}
            />
          ) : null}
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" className={fieldClass} />
          <input type="hidden" name="imageUrl" value={offer?.image ?? ""} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t("vendor.discountType")}
            <select
              name="discountType"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as OfferDiscountType)}
              className={fieldClass}
            >
              <option value="PERCENT">{t("vendor.discountPercent")}</option>
              <option value="AMOUNT">{t("vendor.discountAmount")}</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t("vendor.discountVal")}
            <input
              name="discountVal"
              type="number"
              min="1"
              max={discountType === "PERCENT" ? "100" : undefined}
              step="1"
              required
              defaultValue={offer ? String(offer.discountVal) : String(draft?.discountVal ?? 20)}
              className={fieldClass}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDurationMode("duration")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              durationMode === "duration" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {t("vendor.durationPreset")}
          </button>
          <button
            type="button"
            onClick={() => setDurationMode("exact")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              durationMode === "exact" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {t("vendor.exactEnd")}
          </button>
        </div>
        {durationMode === "duration" ? (
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setDurationMinutes(minutes)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium",
                  durationMinutes === minutes
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/70 text-muted-foreground",
                )}
              >
                {minutes >= 60
                  ? t("vendor.hoursCount", { count: minutes / 60 })
                  : t("vendor.minutesCount", { count: minutes })}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t("vendor.startDate")}
              <input
                name="startDate"
                type="datetime-local"
                defaultValue={offer ? toLocalInput(offer.startDate) : toLocalInput(new Date())}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t("vendor.endDate")}
              <input
                name="endDate"
                type="datetime-local"
                required
                defaultValue={offer ? toLocalInput(offer.endDate) : ""}
                className={fieldClass}
              />
            </label>
          </div>
        )}
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("vendor.category")}
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={fieldClass}
          >
            <option value="">{t("vendor.offerWholeStore")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t("vendor.offerProduct")}
          <select
            name="productId"
            defaultValue={offer?.productId ?? draft?.productId ?? ""}
            className={fieldClass}
          >
            <option value="">{t("vendor.noLinkedProduct")}</option>
            {filteredProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={offer?.isActive ?? true} />
          {t("vendor.offerActive")}
        </label>
        <div className="flex gap-2">
          <Button type="submit" isDisabled={pending}>
            {t("common.save")}
          </Button>
          <Button variant="outline" type="button" onPress={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
