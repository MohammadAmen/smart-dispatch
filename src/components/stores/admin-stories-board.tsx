"use client";

import { Eye, Heart, ImageIcon, Pencil, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteAdminStoryAction, saveAdminStoryAction } from "@/lib/stores/story-actions";
import { invalidateActiveStories } from "@/lib/stores/story-query";
import {
  STORY_IMAGE_SECONDS,
  STORY_MAX_SECONDS,
  type StoryActionType,
  type VendorStoryRecord,
} from "@/lib/stores/story-types";
import { formatCountdown } from "@/lib/stores/offer-types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminStoriesBoard({ stories }: { stories: VendorStoryRecord[] }): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<VendorStoryRecord | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(
    () => ({
      views: stories.reduce((sum, story) => sum + story.viewsCount, 0),
      likes: stories.reduce((sum, story) => sum + story.likesCount, 0),
      live: stories.filter((story) => story.active).length,
    }),
    [stories],
  );

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, close = false): void => {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      if (close) {
        setCreating(false);
        setEditing(null);
      }
      void invalidateActiveStories();
      router.refresh();
    });
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("ads.title")}
        description={t("ads.description")}
        action={
          <Button onPress={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            {t("ads.add")}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard hover={false} className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("vendor.storyLive")}</p>
          <p className="font-heading text-2xl font-semibold">{stats.live}</p>
        </GlassCard>
        <GlassCard hover={false} className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("vendor.storyViews")}</p>
          <p className="font-heading text-2xl font-semibold">{stats.views}</p>
        </GlassCard>
        <GlassCard hover={false} className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("vendor.storyLikes")}</p>
          <p className="font-heading text-2xl font-semibold">{stats.likes}</p>
        </GlassCard>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {stories.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("ads.empty")}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => (
            <GlassCard key={story.id} className="overflow-hidden p-0">
              <div className="relative aspect-[9/14] bg-black">
                {story.mediaType === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={story.videoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <video src={story.videoUrl} className="size-full object-cover" muted playsInline preload="metadata" />
                )}
                <span className="absolute start-3 top-3">
                  <StatusBadge
                    label={story.active ? t("vendor.storyLive") : t("vendor.storyExpired")}
                    tone={story.active ? "success" : "muted"}
                  />
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="font-heading font-semibold">{story.title}</p>
                  {story.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{story.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3.5" />
                    {story.viewsCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3.5" />
                    {story.likesCount}
                  </span>
                  <span>
                    {story.active
                      ? t("vendor.storyEndsIn", { time: formatCountdown(Math.max(0, Date.parse(story.expiresAt) - Date.now())) })
                      : t("vendor.storyExpired")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onPress={() => setEditing(story)}>
                    <Pencil data-icon="inline-start" />
                    {t("common.edit")}
                  </Button>
                  <form action={(formData) => run(() => deleteAdminStoryAction(formData))}>
                    <input type="hidden" name="id" value={story.id} />
                    <Button variant="destructive" size="sm" type="submit" isDisabled={pending}>
                      <Trash2 data-icon="inline-start" />
                      {t("common.delete")}
                    </Button>
                  </form>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {creating ? (
        <AdminStoryEditor
          story={null}
          pending={pending}
          onClose={() => setCreating(false)}
          onSubmit={(formData) => run(() => saveAdminStoryAction(formData), true)}
        />
      ) : null}
      {editing ? (
        <AdminStoryEditor
          story={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSubmit={(formData) => run(() => saveAdminStoryAction(formData), true)}
        />
      ) : null}
    </FadeIn>
  );
}

function AdminStoryEditor({
  story,
  pending,
  onClose,
  onSubmit,
}: {
  story: VendorStoryRecord | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}): ReactNode {
  const { t } = useLocale();
  const [actionType, setActionType] = useState<StoryActionType>(story?.actionType ?? "CONTACT_US");
  const [customExpiry, setCustomExpiry] = useState(false);
  const [preview, setPreview] = useState<string | null>(story?.videoUrl ?? null);
  const [mediaKind, setMediaKind] = useState(story?.mediaType ?? "VIDEO");
  const [duration, setDuration] = useState(story?.duration ?? STORY_IMAGE_SECONDS);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const onMedia = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("image/")) {
      setMediaKind("IMAGE");
      setDuration(STORY_IMAGE_SECONDS);
      setPreview(url);
      setMediaError(null);
      return;
    }
    const node = document.createElement("video");
    node.preload = "metadata";
    node.src = url;
    node.onloadedmetadata = () => {
      const seconds = node.duration;
      if (!Number.isFinite(seconds) || seconds > STORY_MAX_SECONDS) {
        URL.revokeObjectURL(url);
        event.target.value = "";
        setPreview(null);
        setDuration(0);
        setMediaError(t("vendor.storyTooLong"));
        return;
      }
      setMediaKind("VIDEO");
      setMediaError(null);
      setDuration(Math.max(1, Math.round(seconds)));
      setPreview(url);
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-background/55 backdrop-blur-sm" onClick={onClose} />
      <GlassCard hover={false} className="relative z-10 max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto">
        <div>
          <h2 className="font-heading text-lg font-semibold">{story ? t("ads.edit") : t("ads.add")}</h2>
          <p className="text-xs text-muted-foreground">{t("ads.hint")}</p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!story && mediaKind === "VIDEO" && (duration <= 0 || duration > STORY_MAX_SECONDS)) {
              setMediaError(t("vendor.storyTooLong"));
              return;
            }
            onSubmit(new FormData(event.currentTarget));
          }}
        >
          {story ? <input type="hidden" name="id" value={story.id} /> : null}
          <input type="hidden" name="duration" value={duration} />
          <input type="hidden" name="actionType" value={actionType} />
          <input type="hidden" name="customExpiry" value={customExpiry ? "true" : ""} />

          {!story ? (
            <label className="block space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{t("ads.media")}</span>
              {preview ? (
                mediaKind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-56 w-full rounded-2xl object-cover" />
                ) : (
                  <video src={preview} className="h-56 w-full rounded-2xl object-cover" controls playsInline />
                )
              ) : (
                <span className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-linear-to-br from-primary/8 to-warning/10 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Play className="size-6" />
                    <ImageIcon className="size-6" />
                  </span>
                  <span className="text-xs">{t("ads.mediaHint")}</span>
                </span>
              )}
              <input
                name="media"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
                required
                className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                onChange={onMedia}
              />
            </label>
          ) : preview ? (
            mediaKind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-44 w-full rounded-2xl object-cover" />
            ) : (
              <video src={preview} className="h-44 w-full rounded-2xl object-cover" controls playsInline />
            )
          ) : null}

          {mediaError ? <p className="text-sm text-destructive">{mediaError}</p> : null}

          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("ads.adTitle")}
            <input name="title" required defaultValue={story?.title ?? ""} className={fieldClass} />
          </label>
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("ads.adDescription")}
            <textarea
              name="description"
              rows={3}
              defaultValue={story?.description ?? ""}
              className={cn(fieldClass, "h-auto py-2")}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActionType("CONTACT_US")}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium",
                actionType === "CONTACT_US"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {t("ads.contactAction")}
            </button>
            <button
              type="button"
              onClick={() => setActionType("EXTERNAL_LINK")}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium",
                actionType === "EXTERNAL_LINK"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {t("ads.linkAction")}
            </button>
          </div>

          {actionType === "CONTACT_US" ? (
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              {t("ads.contactNumber")}
              <input
                name="contactNumber"
                required
                defaultValue={story?.contactNumber ?? ""}
                className={fieldClass}
                placeholder="+9627..."
              />
            </label>
          ) : (
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              {t("ads.externalLink")}
              <input
                name="externalLink"
                type="url"
                required
                defaultValue={story?.externalLink ?? ""}
                className={fieldClass}
                placeholder="https://"
              />
            </label>
          )}

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
            <span className="text-sm font-medium">{t("ads.customExpiry")}</span>
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={customExpiry}
              onChange={(event) => setCustomExpiry(event.target.checked)}
            />
          </label>
          {customExpiry ? (
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              {t("ads.expiresHours")}
              <input name="expiresHours" type="number" min="1" max="720" defaultValue="72" className={fieldClass} />
            </label>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onPress={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isDisabled={pending}>
              <Sparkles data-icon="inline-start" />
              {t("common.save")}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
