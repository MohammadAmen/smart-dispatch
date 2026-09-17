"use client";

import { Pencil, Plus, Shapes, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { deleteStoreTypeAction, saveStoreTypeAction } from "@/lib/stores/actions";
import { STORE_TYPE_ICONS, storeTypeIcon } from "@/lib/stores/store-type-icon";
import type { StoreTypeRecord } from "@/lib/stores/types";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminStoreTypesBoard({
  types,
}: {
  types: StoreTypeRecord[];
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<StoreTypeRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = (): void => {
    router.refresh();
    setCreating(false);
    setEditing(null);
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("stores.typesTitle")}
        description={t("stores.typesDescription")}
        action={
          <Button
            onPress={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            <Plus data-icon="inline-start" />
            {t("stores.addType")}
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {types.length === 0 ? (
            <GlassCard hover={false}>
              <p className="text-sm text-muted-foreground">{t("stores.emptyTypes")}</p>
            </GlassCard>
          ) : (
            types.map((type) => {
              const Icon = storeTypeIcon(type.icon);
              return (
                <GlassCard
                  key={type.id}
                  hover={false}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("stores.typeStores", { count: type.storeCount })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onPress={() => {
                        setEditing(type);
                        setCreating(false);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      {t("common.edit")}
                    </Button>
                    <form
                      action={(formData) => {
                        startTransition(async () => {
                          const result = await deleteStoreTypeAction(formData);
                          if (!result.ok) {
                            setError(result.error ?? "Failed.");
                            return;
                          }
                          setError(null);
                          refresh();
                        });
                      }}
                    >
                      <input type="hidden" name="id" value={type.id} />
                      <Button variant="destructive" type="submit" isDisabled={pending}>
                        <Trash2 className="size-3.5" />
                        {t("common.delete")}
                      </Button>
                    </form>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>

        {creating || editing ? (
          <GlassCard hover={false}>
            <h2 className="mb-4 flex items-center gap-2 font-medium">
              <Shapes className="size-4" />
              {editing ? t("stores.editType") : t("stores.addType")}
            </h2>
            <form
              action={(formData) => {
                startTransition(async () => {
                  const result = await saveStoreTypeAction(formData);
                  if (!result.ok) {
                    setError(result.error ?? "Failed.");
                    return;
                  }
                  setError(null);
                  refresh();
                });
              }}
              className="space-y-3"
            >
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t("stores.typeName")}
                <input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  required
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t("stores.sortOrder")}
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={editing?.sortOrder ?? 0}
                  className={fieldClass}
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-muted-foreground">{t("stores.typeIcon")}</legend>
                <div className="grid grid-cols-4 gap-2">
                  {STORE_TYPE_ICONS.map((icon) => {
                    const Icon = storeTypeIcon(icon);
                    return (
                      <label
                        key={icon}
                        className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border bg-background/60 px-2 py-2 text-[10px] has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                      >
                        <input
                          type="radio"
                          name="icon"
                          value={icon}
                          defaultChecked={(editing?.icon ?? "store") === icon}
                          className="sr-only"
                        />
                        <Icon className="size-4" />
                        {icon}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex gap-2">
                <Button type="submit" isDisabled={pending}>
                  {t("common.save")}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onPress={() => {
                    setCreating(false);
                    setEditing(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </GlassCard>
        ) : null}
      </div>
    </FadeIn>
  );
}
