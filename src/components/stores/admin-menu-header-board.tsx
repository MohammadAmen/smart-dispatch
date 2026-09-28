"use client";

import { ImagePlus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { saveMenuHeaderAction } from "@/lib/stores/actions";
import type { AppConfigRecord } from "@/lib/platform/app-config-types";
import { DEFAULT_MENU_HEADER_BACKGROUND } from "@/lib/platform/app-config-defaults";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminMenuHeaderBoard({ config }: { config: AppConfigRecord }): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState(config.menuHeaderBackgroundUrl ?? "");
  const [preview, setPreview] = useState<string | null>(
    config.menuHeaderBackgroundUrl ?? DEFAULT_MENU_HEADER_BACKGROUND,
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("stores.menuHeaderTitle")}
        description={t("stores.menuHeaderDescription")}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard hover={false} className="space-y-4">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("menuHeaderBackgroundUrl", imageUrl);
              startTransition(async () => {
                const result = await saveMenuHeaderAction(formData);
                if (!result.ok) {
                  setError(result.error ?? "Failed.");
                  return;
                }
                setError(null);
                router.refresh();
              });
            }}
          >
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              {t("stores.menuHeaderImageUrl")}
              <input
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  setPreview(event.target.value.trim() || DEFAULT_MENU_HEADER_BACKGROUND);
                }}
                placeholder="https://… or /api/uploads/…"
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              {t("stores.menuHeaderUpload")}
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onFileChange}
                className={fieldClass}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-sm">
              {t("stores.menuHeaderResetDefault")}
              <input type="checkbox" name="clearBackground" className="size-4 accent-primary" />
            </label>

            <div className="flex justify-end gap-2">
              <Button type="submit" isDisabled={pending}>
                <Save className="size-3.5" />
                {t("common.save")}
              </Button>
            </div>
          </form>
        </GlassCard>

        <GlassCard hover={false} className="space-y-3">
          <p className="text-sm font-medium">{t("stores.menuHeaderPreview")}</p>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-border/60">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-muted">
                <ImagePlus className="size-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-black/20" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="font-heading text-lg font-bold">BEEV</p>
              <p className="text-sm font-semibold drop-shadow">{t("menu.heroSlogan")}</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </FadeIn>
  );
}
