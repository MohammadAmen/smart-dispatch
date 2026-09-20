"use client";

import { AnimatePresence, m } from "framer-motion";
import { LoaderCircle, MapPin, Navigation, Store, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { MenuQtyControl } from "@/components/menu/menu-qty-control";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { osmEmbedUrl } from "@/lib/geo";
import type { CartStoreGroup } from "@/lib/stores/menu-cart";
import {
  composeDeliveryAddress,
  hasValidCoords,
  type MenuCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import { formatMoney } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function MenuCheckoutSheet({
  open,
  draft,
  groups,
  storeNotes,
  subtotal,
  deliveryFee,
  distanceKm,
  stopCount,
  itemCount,
  locating,
  pending,
  error,
  confirmClear,
  onClose,
  onChange,
  onNote,
  onIncrease,
  onDecrease,
  onLocate,
  onConfirm,
  onClear,
  onConfirmClear,
  onCancelClear,
  dineInLabel,
}: {
  open: boolean;
  draft: MenuCheckoutDraft;
  groups: CartStoreGroup[];
  storeNotes: Record<string, string>;
  subtotal: number;
  deliveryFee: number;
  distanceKm: number;
  stopCount: number;
  itemCount: number;
  locating: boolean;
  pending: boolean;
  error: string | null;
  confirmClear: boolean;
  onClose: () => void;
  onChange: (patch: Partial<MenuCheckoutDraft>) => void;
  onNote: (storeId: string, note: string) => void;
  onIncrease: (lineKey: string) => void;
  onDecrease: (lineKey: string) => void;
  onLocate: () => void;
  onConfirm: () => void;
  onClear: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
  dineInLabel?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const [mapFailed, setMapFailed] = useState(false);
  const coordsReady = hasValidCoords(draft);
  const mapSrc =
    coordsReady && draft.latitude != null && draft.longitude != null
      ? osmEmbedUrl(draft.latitude, draft.longitude)
      : null;
  const grandTotal = subtotal + deliveryFee;

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="fixed inset-0 z-50 flex items-end justify-center"
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
          <m.section
            role="dialog"
            aria-modal="true"
            initial={{ y: 48 }}
            animate={{ y: 0 }}
            exit={{ y: 56 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-x border-t"
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border" />
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  {dineInLabel ? t("menu.checkoutTitleDineIn") : t("menu.checkoutTitle")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("menu.checkoutHint", {
                    count: itemCount,
                    total: `${formatMoney(grandTotal)} ${t("menu.currency")}`,
                  })}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onPress={onClose}>
                <X />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6">
              {dineInLabel ? (
                <p className="rounded-2xl bg-primary/12 px-3 py-2 text-sm font-semibold text-primary">
                  {t("menu.dineInBanner", { table: dineInLabel })}
                </p>
              ) : null}
              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <article key={group.storeId} className="rounded-2xl border border-border/70 bg-background/55 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        {group.storeLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.storeLogoUrl}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-primary">
                            <Store className="size-3.5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{group.storeName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t("menu.storeAvailable")} · {formatMoney(group.subtotal)} {t("menu.currency")}
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {group.lines.map((line) => (
                          <li key={line.lineKey} className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{line.name}</span>
                              {line.optionSummary ? (
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {line.optionSummary}
                                </span>
                              ) : null}
                            </span>
                            <MenuQtyControl
                              quantity={line.quantity}
                              onIncrease={() => onIncrease(line.lineKey)}
                              onDecrease={() => onDecrease(line.lineKey)}
                            />
                          </li>
                        ))}
                      </ul>
                      <label className="mt-3 block space-y-1.5 text-xs font-medium text-muted-foreground">
                        {dineInLabel ? t("menu.kitchenNotes") : t("menu.storeNotes")}
                        <input
                          value={storeNotes[group.storeId] ?? ""}
                          onChange={(event) => onNote(group.storeId, event.target.value)}
                          placeholder={dineInLabel ? t("menu.kitchenNotesHint") : t("menu.storeNotesHint")}
                          className={fieldClass}
                          maxLength={500}
                        />
                      </label>
                    </article>
                  ))}
                </div>
              ) : null}

              {itemCount > 0 ? (
                <div className="space-y-1.5 rounded-2xl border border-border/70 bg-muted/30 px-3 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {dineInLabel ? t("menu.subtotalMeals") : t("menu.subtotal")}
                    </span>
                    <span className="font-semibold">
                      {formatMoney(subtotal)} {t("menu.currency")}
                    </span>
                  </div>
                  {dineInLabel ? null : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("menu.deliveryFee")}</span>
                      <span className="font-semibold">
                        {formatMoney(deliveryFee)} {t("menu.currency")}
                      </span>
                    </div>
                  )}
                  {dineInLabel || stopCount <= 1 ? null : (
                    <p className="text-[11px] text-muted-foreground">
                      {t("menu.multiStopFee", {
                        stops: stopCount,
                        km: distanceKm.toFixed(1),
                      })}
                    </p>
                  )}
                  <div className="flex justify-between border-t border-border/60 pt-2 font-heading font-semibold">
                    <span>{t("menu.grandTotal")}</span>
                    <span>
                      {formatMoney(grandTotal)} {t("menu.currency")}
                    </span>
                  </div>
                </div>
              ) : null}

              {itemCount > 0 ? (
                confirmClear ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/8 px-3 py-3">
                    <p className="text-sm font-medium">{t("menu.confirmClearCart")}</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="destructive" className="flex-1" onPress={onConfirmClear}>
                        {t("menu.clearCart")}
                      </Button>
                      <Button variant="outline" className="flex-1" onPress={onCancelClear}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" className="w-full text-destructive" onPress={onClear}>
                    <Trash2 className="size-4" />
                    {t("menu.clearCart")}
                  </Button>
                )
              ) : null}

              {dineInLabel ? null : (
              <>
              <div className="overflow-hidden rounded-2xl border border-border/70">
                {mapSrc && !mapFailed ? (
                  <iframe
                    title={t("menu.mapPreview")}
                    src={mapSrc}
                    className="h-40 w-full border-0"
                    loading="lazy"
                    onError={() => setMapFailed(true)}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-muted/60 text-muted-foreground">
                    {locating ? (
                      <LoaderCircle className="size-6 animate-spin" />
                    ) : (
                      <MapPin className="size-6 opacity-50" />
                    )}
                  </div>
                )}
              </div>

              <Button variant="outline" className="w-full" onPress={onLocate} isDisabled={locating}>
                {locating ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Navigation className="size-4" />
                )}
                {t("menu.useGps")}
              </Button>

              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("menu.street")}
                <input
                  value={draft.street}
                  onChange={(event) => onChange({ street: event.target.value })}
                  placeholder={t("menu.streetHint")}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("menu.apartment")}
                <input
                  value={draft.apartment}
                  onChange={(event) => onChange({ apartment: event.target.value })}
                  placeholder={t("menu.apartmentHint")}
                  className={fieldClass}
                />
              </label>
              </>
              )}
              {dineInLabel ? (
                <>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("menu.guestName")}
                    <input
                      value={draft.guestName}
                      onChange={(event) => onChange({ guestName: event.target.value })}
                      placeholder={t("menu.guestNameHint")}
                      className={fieldClass}
                      maxLength={80}
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("menu.guestPhone")}
                    <input
                      value={draft.phone}
                      onChange={(event) => onChange({ phone: event.target.value })}
                      inputMode="tel"
                      placeholder={t("menu.guestPhoneHint")}
                      className={fieldClass}
                    />
                  </label>
                  <p className="rounded-2xl bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
                    {t("menu.payAtCounterHint")}
                  </p>
                </>
              ) : (
                <>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("menu.notes")}
                    <input
                      value={draft.notes}
                      onChange={(event) => onChange({ notes: event.target.value })}
                      placeholder={t("menu.notesHint")}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("menu.phone")}
                    <input
                      value={draft.phone}
                      onChange={(event) => onChange({ phone: event.target.value })}
                      inputMode="tel"
                      className={fieldClass}
                    />
                  </label>
                </>
              )}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {dineInLabel ? null : (
                <p className={cn("text-[11px] text-muted-foreground")}>
                  {composeDeliveryAddress(draft) || t("menu.addressMissing")}
                </p>
              )}
              <Button className="h-11 w-full rounded-2xl text-sm" onPress={onConfirm} isDisabled={pending}>
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {itemCount === 0
                  ? t("menu.saveAddress")
                  : dineInLabel
                    ? t("menu.sendToKitchen")
                    : t("menu.confirmOrder")}
              </Button>
            </div>
          </m.section>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
