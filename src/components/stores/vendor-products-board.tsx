"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import { DiscountBadge } from "@/components/stores/discount-badge";
import { ProductEditorModal } from "@/components/stores/product-editor-modal";
import { ProductPrice } from "@/components/stores/product-price";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteProductAction, toggleProductAvailabilityAction } from "@/lib/stores/actions";
import { discountPercentOff } from "@/lib/stores/pricing";
import { primaryProductImage, productImages } from "@/lib/stores/product-images";
import type { CategoryRecord, ProductRecord, StoreRecord } from "@/lib/stores/types";

export function VendorProductsBoard({
  store,
  categories,
  products,
  draftName = "",
}: {
  store: StoreRecord | null;
  categories: CategoryRecord[];
  products: ProductRecord[];
  draftName?: string;
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [pending, startTransition] = useTransition();
  const [presetName, setPresetName] = useState(draftName);

  useEffect(() => {
    if (!draftName || categories.length === 0) {
      return;
    }
    setEditing(null);
    setPresetName(draftName);
    setEditorOpen(true);
  }, [draftName, categories.length]);

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.products")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const run = (task: () => Promise<{ ok: boolean; error?: string }>): void => {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const openCreate = (): void => {
    setEditing(null);
    setPresetName("");
    setEditorOpen(true);
  };

  const openEdit = (product: ProductRecord): void => {
    setEditing(product);
    setEditorOpen(true);
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("vendor.products")}
        description={t("vendor.productsDesc")}
        action={
          <Link
            href="/vendor/products/new"
            className={categories.length === 0 ? "pointer-events-none opacity-50" : undefined}
          >
            <Button isDisabled={categories.length === 0}>
              <Plus data-icon="inline-start" />
              {t("vendor.addProduct")}
            </Button>
          </Link>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {categories.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("vendor.emptyCategories")}</p>
        </GlassCard>
      ) : null}

      {products.length === 0 && categories.length > 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("vendor.emptyProducts")}</p>
        </GlassCard>
      ) : null}

      {products.length > 0 ? (
        <>
      <div className="hidden overflow-hidden rounded-2xl border border-border/60 lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-start text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">{t("vendor.name")}</th>
              <th className="px-4 py-3 font-medium">{t("vendor.category")}</th>
              <th className="px-4 py-3 font-medium">{t("vendor.price")}</th>
              <th className="px-4 py-3 font-medium">{t("vendor.available")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const percent = discountPercentOff(product);
              return (
                <tr key={`row-${product.id}`} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {primaryProductImage(product) ? (
                        <span className="relative shrink-0">
                          <img src={primaryProductImage(product) ?? ""} alt="" className="size-12 rounded-lg object-cover" />
                          {productImages(product).length > 1 ? (
                            <span className="absolute -end-1 -bottom-1 rounded-full bg-background px-1 text-[9px] font-semibold ring-1 ring-border">
                              {productImages(product).length}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
                          —
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{product.name}</p>
                          {percent ? (
                            <DiscountBadge variant="compact" label={t("vendor.off", { percent })} />
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.categoryName}</td>
                  <td className="px-4 py-3"><ProductPrice product={product} /></td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={product.available ? t("vendor.available") : t("vendor.unavailable")}
                      tone={product.available ? "success" : "muted"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onPress={() => openEdit(product)}>
                        {t("common.edit")}
                      </Button>
                      <form action={(formData) => run(() => deleteProductAction(formData))}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <input type="hidden" name="id" value={product.id} />
                        <Button variant="destructive" size="sm" type="submit" isDisabled={pending}>
                          {t("common.delete")}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {products.map((product) => {
          const percent = discountPercentOff(product);
          return (
            <GlassCard key={product.id} className="overflow-hidden p-0">
              <div className="relative h-40 bg-muted/40">
                {primaryProductImage(product) ? (
                  <>
                    <img src={primaryProductImage(product) ?? ""} alt="" className="size-full object-cover" />
                    {productImages(product).length > 1 ? (
                      <span className="absolute end-3 bottom-3 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md">
                        {productImages(product).length}/4
                      </span>
                    ) : null}
                  </>
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    {product.name}
                  </div>
                )}
                {percent ? (
                  <DiscountBadge
                    pulse
                    label={t("vendor.off", { percent })}
                    className="absolute start-3 top-3 z-10"
                  />
                ) : null}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.categoryName}</p>
                  </div>
                  <StatusBadge
                    label={product.available ? t("vendor.available") : t("vendor.unavailable")}
                    tone={product.available ? "success" : "muted"}
                  />
                </div>
                <ProductPrice product={product} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onPress={() => openEdit(product)}>
                    <Pencil data-icon="inline-start" />
                    {t("common.edit")}
                  </Button>
                  <form action={(formData) => run(() => toggleProductAvailabilityAction(formData))}>
                    <input type="hidden" name="storeId" value={store.id} />
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="available" value={product.available ? "" : "true"} />
                    <Button variant="outline" size="sm" type="submit" isDisabled={pending}>
                      {product.available ? t("vendor.unavailable") : t("vendor.available")}
                    </Button>
                  </form>
                  <form action={(formData) => run(() => deleteProductAction(formData))}>
                    <input type="hidden" name="storeId" value={store.id} />
                    <input type="hidden" name="id" value={product.id} />
                    <Button variant="destructive" size="sm" type="submit" isDisabled={pending}>
                      <Trash2 data-icon="inline-start" />
                      {t("common.delete")}
                    </Button>
                  </form>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
        </>
      ) : null}

      <ProductEditorModal
        open={editorOpen}
        storeId={store.id}
        categories={categories}
        product={editing}
        draftName={editing ? "" : presetName}
        pending={pending}
        onClose={() => {
          setEditorOpen(false);
          setPresetName("");
        }}
        onSaved={() => {
          setEditorOpen(false);
          setEditing(null);
          setPresetName("");
          router.refresh();
        }}
      />
    </FadeIn>
  );
}
