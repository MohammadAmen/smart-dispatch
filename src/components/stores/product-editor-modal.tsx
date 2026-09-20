"use client";

import { AnimatePresence, m } from "framer-motion";
import { ImagePlus, Star, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  ProductOptionBuilder,
  type OptionGroupDraft,
} from "@/components/stores/product-option-builder";
import { saveProductAction } from "@/lib/stores/actions";
import { MAX_PRODUCT_IMAGES, productImages } from "@/lib/stores/product-images";
import type { CategoryRecord, ProductRecord } from "@/lib/stores/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface ImageSlot {
  key: string;
  preview: string;
  url?: string;
  file?: File;
}

function slotsFromProduct(product: ProductRecord | null): ImageSlot[] {
  return productImages(product ?? { imageUrl: null, images: [] }).map((url) => ({
    key: url,
    preview: url,
    url,
  }));
}

function revokeSlot(slot: ImageSlot): void {
  if (slot.preview.startsWith("blob:")) {
    URL.revokeObjectURL(slot.preview);
  }
}

export function ProductEditorModal({
  open,
  storeId,
  categories,
  product,
  draftName = "",
  pending,
  embedded = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  storeId: string;
  categories: CategoryRecord[];
  product: ProductRecord | null;
  draftName?: string;
  pending: boolean;
  embedded?: boolean;
  onClose: () => void;
  onSaved: () => void;
}): ReactNode {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const slotsRef = useRef<ImageSlot[]>([]);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [available, setAvailable] = useState(true);
  const [slots, setSlots] = useState<ImageSlot[]>(() => slotsFromProduct(product));
  const [optionGroups, setOptionGroups] = useState<OptionGroupDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setHasDiscount(product?.hasDiscount ?? false);
    setAvailable(product?.available ?? true);
    setSlots((current) => {
      current.forEach(revokeSlot);
      return slotsFromProduct(product);
    });
    setOptionGroups(
      (product?.optionGroups ?? []).map((group) => ({
        key: group.id,
        name: group.name,
        type: group.type,
        required: group.required,
        values: group.values.map((value) => ({
          key: value.id,
          name: value.name,
          extraPrice: value.extraPrice,
          colorHex: value.colorHex ?? "#e9b71f",
        })),
      })),
    );
    setError(null);
  }, [open, product]);

  slotsRef.current = slots;

  useEffect(() => {
    return () => {
      slotsRef.current.forEach(revokeSlot);
    };
  }, []);

  const remaining = MAX_PRODUCT_IMAGES - slots.length;

  const addFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0 || remaining <= 0) {
      return;
    }

    setSlots((current) => {
      const room = MAX_PRODUCT_IMAGES - current.length;
      const next = files.slice(0, room).map((file) => ({
        key: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
        file,
      }));
      return [...current, ...next];
    });
  };

  const removeSlot = (key: string): void => {
    setSlots((current) => {
      const target = current.find((slot) => slot.key === key);
      if (target) {
        revokeSlot(target);
      }
      return current.filter((slot) => slot.key !== key);
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "optionGroups",
      JSON.stringify(
        optionGroups.map((group) => ({
          name: group.name,
          type: group.type,
          required: group.required,
          values: group.values,
        })),
      ),
    );
    for (const slot of slots) {
      if (slot.url) {
        formData.append("keptImage", slot.url);
      }
      if (slot.file) {
        formData.append("images", slot.file);
      }
    }
    setSaving(true);
    void (async () => {
      const result = await saveProductAction(formData);
      setSaving(false);
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      onSaved();
    })();
  };

  const formCard = (
            <GlassCard hover={false} className={cn("space-y-4", !embedded && "max-h-[90dvh] overflow-y-auto")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">
                    {product ? t("vendor.editProduct") : t("vendor.addProduct")}
                  </h2>
                  <p className="text-xs text-muted-foreground">{t("vendor.productsDesc")}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onPress={onClose}>
                  <X />
                </Button>
              </div>

              <form className="space-y-3" onSubmit={onSubmit} key={product?.id ?? "new"}>
                <input type="hidden" name="storeId" value={storeId} />
                {product ? <input type="hidden" name="id" value={product.id} /> : null}
                <input type="hidden" name="hasDiscount" value={hasDiscount ? "true" : ""} />
                <input type="hidden" name="available" value={available ? "true" : ""} />

                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  {t("vendor.category")}
                  <select
                    name="categoryId"
                    required
                    defaultValue={product?.categoryId ?? categories[0]?.id}
                    className={fieldClass}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  {t("vendor.name")}
                  <input
                    key={`${product?.id ?? "new"}-${draftName}`}
                    name="name"
                    required
                    defaultValue={product?.name ?? draftName}
                    className={fieldClass}
                  />
                </label>

                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  {t("vendor.descriptionLabel")}
                  <input
                    name="description"
                    defaultValue={product?.description ?? ""}
                    className={fieldClass}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("vendor.price")}
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={product?.price ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("vendor.sortOrder")}
                    <input
                      name="sortOrder"
                      type="number"
                      min="0"
                      defaultValue={product?.sortOrder ?? 0}
                      className={fieldClass}
                    />
                  </label>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
                  <span className="text-sm font-medium">{t("vendor.hasDiscount")}</span>
                  <span
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      hasDiscount ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                        hasDiscount ? "start-5" : "start-0.5",
                      )}
                    />
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={hasDiscount}
                    onChange={(event) => setHasDiscount(event.target.checked)}
                  />
                </label>

                {hasDiscount ? (
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("vendor.discountPrice")}
                    <input
                      name="discountPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={product?.discountPrice ?? ""}
                      className={fieldClass}
                    />
                  </label>
                ) : null}

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
                  <span className="text-sm font-medium">{t("vendor.available")}</span>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={available}
                    onChange={(event) => setAvailable(event.target.checked)}
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">{t("vendor.productImages")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("vendor.imageCount", { count: slots.length, max: MAX_PRODUCT_IMAGES })}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t("vendor.productImagesHint")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map((slot, index) => (
                      <div key={slot.key} className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slot.preview} alt="" className="aspect-square w-full object-cover" />
                        {index === 0 ? (
                          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md">
                            <Star className="size-2.5 fill-current" />
                            {t("vendor.coverImageBadge")}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.key)}
                          className="absolute end-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md"
                          aria-label={t("vendor.removeProductImage")}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {remaining > 0 ? (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-linear-to-br from-primary/8 via-warning/8 to-glow/10 text-muted-foreground"
                      >
                        <span className="brand-sheen flex size-10 items-center justify-center rounded-2xl text-primary-foreground shadow-lg shadow-primary/30">
                          <ImagePlus className="size-5" />
                        </span>
                        <span className="px-2 text-center text-[11px] font-medium">
                          {t("vendor.addProductImage")}
                        </span>
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="sr-only"
                    onChange={addFiles}
                  />
                </div>

                <ProductOptionBuilder groups={optionGroups} onChange={setOptionGroups} />

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" type="button" onPress={onClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" isDisabled={pending || saving}>
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </GlassCard>
  );

  if (embedded) {
    return open ? formCard : null;
  }

  return (
    <AnimatePresence>
      {open ? (
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
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl"
          >
            {formCard}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
