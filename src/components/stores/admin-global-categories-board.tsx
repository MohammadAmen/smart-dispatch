"use client";

import { ImagePlus, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ChangeEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { deleteGlobalCategoryAction, saveGlobalCategoryAction } from "@/lib/stores/actions";
import type { GlobalCategoryRecord } from "@/lib/stores/global-categories-admin-types";
import type { StoreTypeRecord } from "@/lib/stores/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminGlobalCategoriesBoard({
  categories,
  storeTypes,
}: {
  categories: GlobalCategoryRecord[];
  storeTypes: StoreTypeRecord[];
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [filterTypeId, setFilterTypeId] = useState<string>("all");
  const [editing, setEditing] = useState<GlobalCategoryRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () =>
      filterTypeId === "all"
        ? categories
        : categories.filter((item) => item.storeTypeId === filterTypeId),
    [categories, filterTypeId],
  );

  const refresh = (): void => {
    router.refresh();
    setCreating(false);
    setEditing(null);
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("stores.globalCategoriesTitle")}
        description={t("stores.globalCategoriesDescription")}
        action={
          <Button
            onPress={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            <Plus data-icon="inline-start" />
            {t("stores.addGlobalCategory")}
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          active={filterTypeId === "all"}
          label={t("menu.allTypes")}
          onClick={() => setFilterTypeId("all")}
        />
        {storeTypes.map((type) => (
          <FilterChip
            key={type.id}
            active={filterTypeId === type.id}
            label={type.name}
            onClick={() => setFilterTypeId(type.id)}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {visible.length === 0 ? (
            <GlassCard hover={false}>
              <p className="text-sm text-muted-foreground">{t("stores.emptyGlobalCategories")}</p>
            </GlassCard>
          ) : (
            visible.map((category) => (
              <GlassCard
                key={category.id}
                hover={false}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background text-xl">
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt=""
                        className="size-full bg-transparent object-contain"
                      />
                    ) : (
                      <span>{category.icon || "📦"}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.storeTypeName ?? "—"} · {t("stores.globalLinkedCount", { count: category.linkedCount })}
                      {category.isOther ? ` · ${t("stores.globalOtherBadge")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onPress={() => {
                      setEditing(category);
                      setCreating(false);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    {t("common.edit")}
                  </Button>
                  <form
                    action={(formData) => {
                      startTransition(async () => {
                        const result = await deleteGlobalCategoryAction(formData);
                        if (!result.ok) {
                          setError(result.error ?? "Failed.");
                          return;
                        }
                        setError(null);
                        refresh();
                      });
                    }}
                  >
                    <input type="hidden" name="id" value={category.id} />
                    <Button variant="destructive" type="submit" isDisabled={pending}>
                      <Trash2 className="size-3.5" />
                      {t("common.delete")}
                    </Button>
                  </form>
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {creating || editing ? (
          <GlobalCategoryEditor
            key={editing?.id ?? "new"}
            category={editing}
            storeTypes={storeTypes}
            defaultStoreTypeId={filterTypeId !== "all" ? filterTypeId : storeTypes[0]?.id ?? ""}
            pending={pending}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSubmit={(formData) => {
              startTransition(async () => {
                const result = await saveGlobalCategoryAction(formData);
                if (!result.ok) {
                  setError(result.error ?? "Failed.");
                  return;
                }
                setError(null);
                refresh();
              });
            }}
          />
        ) : (
          <GlassCard hover={false} className="flex h-fit items-start gap-3 text-sm text-muted-foreground">
            <Tags className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>{t("stores.globalCategoriesHint")}</p>
          </GlassCard>
        )}
      </div>
    </FadeIn>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background/60 text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function GlobalCategoryEditor({
  category,
  storeTypes,
  defaultStoreTypeId,
  pending,
  onCancel,
  onSubmit,
}: {
  category: GlobalCategoryRecord | null;
  storeTypes: StoreTypeRecord[];
  defaultStoreTypeId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}): ReactNode {
  const { t } = useLocale();
  const [preview, setPreview] = useState<string | null>(category?.imageUrl ?? null);
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  return (
    <GlassCard hover={false} className="h-fit space-y-4">
      <h2 className="font-heading text-lg font-semibold">
        {category ? t("stores.editGlobalCategory") : t("stores.addGlobalCategory")}
      </h2>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        {category ? <input type="hidden" name="id" value={category.id} /> : null}
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <input type="hidden" name="active" value="on" />

        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("stores.globalCategoryName")}
          <input name="name" required defaultValue={category?.name ?? ""} className={fieldClass} />
        </label>

        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("stores.globalCategoryStoreType")}
          <select
            name="storeTypeId"
            required
            defaultValue={category?.storeTypeId ?? defaultStoreTypeId}
            className={fieldClass}
          >
            {storeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("stores.globalCategoryIcon")}
          <input name="icon" defaultValue={category?.icon ?? "📦"} className={fieldClass} />
        </label>

        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("vendor.sortOrder")}
          <input
            name="sortOrder"
            type="number"
            min="0"
            defaultValue={category?.sortOrder ?? 0}
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("stores.globalCategoryImageUrl")}
          <input
            value={imageUrl}
            onChange={(event) => {
              setImageUrl(event.target.value);
              setPreview(event.target.value.trim() || null);
            }}
            placeholder="https://… or /api/uploads/…"
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("stores.globalCategoryUpload")}
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onFileChange}
            className={fieldClass}
          />
        </label>

        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3">
          <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white text-2xl dark:border-slate-700 dark:bg-slate-900">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-full bg-transparent object-contain" />
            ) : (
              <ImagePlus className="size-5 text-muted-foreground" />
            )}
          </span>
          <p className="text-xs text-muted-foreground">{t("stores.globalCategoryPreviewHint")}</p>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-sm">
          {t("stores.globalOtherBadge")}
          <input
            type="checkbox"
            name="isOther"
            defaultChecked={category?.isOther ?? false}
            className="size-4 accent-primary"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onPress={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" isDisabled={pending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
