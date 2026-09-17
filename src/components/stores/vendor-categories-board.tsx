"use client";

import { AnimatePresence, m } from "framer-motion";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/stores/actions";
import type { CategoryRecord, StoreRecord } from "@/lib/stores/types";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function VendorCategoriesBoard({
  store,
  categories,
}: {
  store: StoreRecord | null;
  categories: CategoryRecord[];
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.categories")} description={t("vendor.noStore")} />
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

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("vendor.categories")}
        description={t("vendor.categoriesDesc")}
        action={
          <Button onPress={() => { setCreating(true); setEditing(null); }}>
            <Plus data-icon="inline-start" />
            {t("vendor.addCategory")}
          </Button>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {categories.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("vendor.emptyCategories")}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <GlassCard key={category.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="truncate font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("vendor.productCount", { count: category.productCount })}
                </p>
                <StatusBadge
                  label={category.active ? t("vendor.active") : t("vendor.unavailable")}
                  tone={category.active ? "success" : "muted"}
                />
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onPress={() => { setEditing(category); setCreating(false); }}>
                  <Pencil />
                </Button>
                <form action={(formData) => run(() => deleteCategoryAction(formData))}>
                  <input type="hidden" name="storeId" value={store.id} />
                  <input type="hidden" name="id" value={category.id} />
                  <Button variant="destructive" size="icon-sm" type="submit" isDisabled={pending}>
                    <Trash2 />
                  </Button>
                </form>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <CategoryEditorDialog
        open={creating || editing !== null}
        storeId={store.id}
        category={editing}
        pending={pending}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSubmit={(formData) => run(() => saveCategoryAction(formData), true)}
      />
    </FadeIn>
  );
}

function CategoryEditorDialog({
  open,
  storeId,
  category,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  storeId: string;
  category: CategoryRecord | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}): ReactNode {
  const { t } = useLocale();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };

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
            className="relative z-10 w-full max-w-md"
          >
            <GlassCard hover={false} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold">
                  {category ? t("vendor.editCategory") : t("vendor.addCategory")}
                </h2>
                <Button variant="ghost" size="icon-sm" onPress={onClose}>
                  <X />
                </Button>
              </div>
              <form className="space-y-3" onSubmit={handleSubmit}>
                <input type="hidden" name="storeId" value={storeId} />
                {category ? <input type="hidden" name="id" value={category.id} /> : null}
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  {t("vendor.name")}
                  <input name="name" required defaultValue={category?.name ?? ""} className={fieldClass} />
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
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-sm">
                  {t("vendor.active")}
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={category?.active ?? true}
                    className="size-4 accent-primary"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onPress={onClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" isDisabled={pending}>
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
