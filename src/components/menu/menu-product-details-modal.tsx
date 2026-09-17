"use client";

import { AnimatePresence, m } from "framer-motion";
import { Check, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ProductImageSlider } from "@/components/menu/product-image-slider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { productImages } from "@/lib/stores/product-images";
import { effectiveProductPrice, formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import {
  emptyOptionSelection,
  missingRequiredGroups,
  optionExtrasTotal,
  type ProductOptionGroupRecord,
  type ProductOptionSelection,
} from "@/lib/stores/product-options";
import type { MenuProduct } from "@/lib/stores/types";
import { cn } from "@/lib/utils";

function galleryFor(product: MenuProduct, selection: ProductOptionSelection): { images: string[]; activeUrl: string | null } {
  const baseImages = productImages(product);
  const colorGroup = product.optionGroups.find((group) => group.type === "COLOR");
  const selectedIndex = colorGroup
    ? colorGroup.values.findIndex((value) => selection.valueIds.includes(value.id))
    : -1;
  const selectedColor = selectedIndex >= 0 ? colorGroup?.values[selectedIndex] : undefined;
  const extras = product.optionGroups.flatMap((group) =>
    group.values.flatMap((value) => (value.imageUrl ? [value.imageUrl] : [])),
  );
  const images = [...baseImages, ...extras.filter((url) => !baseImages.includes(url))];
  const mapped = selectedColor?.imageUrl ?? (selectedIndex >= 0 ? (baseImages[selectedIndex] ?? null) : null);
  return { images, activeUrl: mapped };
}

function toggleValue(
  groups: ProductOptionGroupRecord[],
  selection: ProductOptionSelection,
  group: ProductOptionGroupRecord,
  valueId: string,
): ProductOptionSelection {
  const groupIds = new Set(group.values.map((value) => value.id));
  if (group.type === "MULTI") {
    const next = selection.valueIds.includes(valueId)
      ? selection.valueIds.filter((id) => id !== valueId)
      : [...selection.valueIds, valueId];
    return { ...selection, valueIds: next };
  }
  return {
    ...selection,
    valueIds: [...selection.valueIds.filter((id) => !groupIds.has(id)), valueId],
  };
}

export function MenuProductDetailsModal({
  product,
  storeName,
  onClose,
  onAdd,
}: {
  product: MenuProduct | null;
  storeName: string;
  onClose: () => void;
  onAdd: (product: MenuProduct, selection: ProductOptionSelection, quantity: number, unitPrice: number) => void;
}): ReactNode {
  const { t } = useLocale();
  const [quantity, setQuantity] = useState(1);
  const [selection, setSelection] = useState<ProductOptionSelection>(emptyOptionSelection());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuantity(1);
    setSelection(emptyOptionSelection());
    setError(null);
  }, [product?.id]);

  const groups = product?.optionGroups ?? [];
  const base = product ? effectiveProductPrice(product) : 0;
  const extras = optionExtrasTotal(groups, selection.valueIds);
  const unit = base + extras;
  const total = unit * quantity;
  const gallery = useMemo(
    () => (product ? galleryFor(product, selection) : { images: [], activeUrl: null }),
    [product, selection],
  );
  const missing = product ? missingRequiredGroups(groups, selection) : [];

  return (
    <AnimatePresence>
      {product ? (
        <m.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            aria-label={t("common.cancel")}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg"
          >
            <GlassCard hover={false} className="max-h-[92dvh] space-y-4 overflow-y-auto rounded-t-3xl sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {storeName}
                  </p>
                  <h2 className="font-heading text-lg font-semibold">{product.name}</h2>
                </div>
                <Button variant="ghost" size="icon-sm" onPress={onClose}>
                  <X />
                </Button>
              </div>

              <div className="overflow-hidden rounded-2xl bg-muted">
                <div className="aspect-[16/10]">
                  <ProductImageSlider
                    images={gallery.images}
                    alt={product.name}
                    showArrows
                    activeUrl={gallery.activeUrl}
                  />
                </div>
              </div>

              {product.description ? (
                <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>
              ) : null}

              {groups.map((group) => (
                <section key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{group.name}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {group.required ? t("menu.optionRequired") : t("menu.optionOptional")}
                    </span>
                  </div>

                  {group.type === "TEXT" ? (
                    <textarea
                      value={selection.note}
                      onChange={(event) => setSelection({ ...selection, note: event.target.value.slice(0, 240) })}
                      rows={3}
                      placeholder={t("menu.specialInstructions")}
                      className="w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  ) : null}

                  {group.type === "COLOR" ? (
                    <div className="flex flex-wrap gap-3">
                      {group.values.map((value) => {
                        const active = selection.valueIds.includes(value.id);
                        return (
                          <button
                            key={value.id}
                            type="button"
                            aria-pressed={active}
                            aria-label={value.name}
                            onClick={() => setSelection(toggleValue(groups, selection, group, value.id))}
                            className="flex min-w-12 flex-col items-center gap-1.5"
                          >
                            <span
                              className={cn(
                                "size-9 rounded-full ring-2 ring-offset-2 ring-offset-background",
                                active ? "ring-primary" : "ring-border",
                              )}
                              style={{ backgroundColor: value.colorHex || "#94a3b8" }}
                            />
                            <span
                              className={cn(
                                "max-w-16 truncate text-[11px] font-medium",
                                active ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {value.name}
                            </span>
                            {value.extraPrice > 0 ? (
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                +{formatMoney(value.extraPrice)} {PRICE_CURRENCY}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {group.type === "SINGLE" ? (
                    <div className="flex flex-wrap gap-2">
                      {group.values.map((value) => {
                        const active = selection.valueIds.includes(value.id);
                        return (
                          <button
                            key={value.id}
                            type="button"
                            onClick={() => setSelection(toggleValue(groups, selection, group, value.id))}
                            className={cn(
                              "rounded-full px-3 py-1.5 text-sm font-semibold",
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {value.name}
                            {value.extraPrice > 0
                              ? ` · +${formatMoney(value.extraPrice)} ${PRICE_CURRENCY}`
                              : ""}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {group.type === "MULTI" ? (
                    <div className="space-y-1.5">
                      {group.values.map((value) => {
                        const active = selection.valueIds.includes(value.id);
                        return (
                          <button
                            key={value.id}
                            type="button"
                            onClick={() => setSelection(toggleValue(groups, selection, group, value.id))}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-start text-sm",
                              active ? "border-primary bg-primary/8" : "border-border/70 bg-background/50",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "flex size-5 items-center justify-center rounded-md border",
                                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                                )}
                              >
                                {active ? <Check className="size-3.5" /> : null}
                              </span>
                              {value.name}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {value.extraPrice > 0
                                ? `+${formatMoney(value.extraPrice)} ${PRICE_CURRENCY}`
                                : t("menu.optionIncluded")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              ))}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="sticky bottom-0 flex items-center gap-3 border-t border-border/60 bg-background/90 pt-3">
                <div className="flex items-center gap-2 rounded-full bg-muted px-2 py-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                  >
                    <Minus />
                  </Button>
                  <span className="min-w-6 text-center text-sm font-bold">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onPress={() => setQuantity((current) => Math.min(99, current + 1))}
                  >
                    <Plus />
                  </Button>
                </div>
                <Button
                  className="h-12 flex-1 rounded-2xl font-bold"
                  onPress={() => {
                    if (missing.length > 0) {
                      setError(t("menu.optionMissing", { name: missing[0].name }));
                      return;
                    }
                    onAdd(product, selection, quantity, unit);
                    onClose();
                  }}
                >
                  {t("menu.addConfigured", {
                    price: `${formatMoney(total)} ${PRICE_CURRENCY}`,
                  })}
                </Button>
              </div>
            </GlassCard>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
