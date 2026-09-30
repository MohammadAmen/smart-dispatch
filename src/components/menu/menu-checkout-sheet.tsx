"use client";

import { ChevronRight, LoaderCircle, MapPin, Navigation, ShoppingBag, Store, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { MenuQtyControl } from "@/components/menu/menu-qty-control";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { CartStoreGroup } from "@/lib/stores/menu-cart";
import {
  composeDeliveryAddress,
  hasValidCoords,
  type MenuCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import { formatMoney } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-amber-400 focus-visible:ring-3 focus-visible:ring-amber-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

type CartStep = "cart" | "checkout";

/**
 * Two-step cart drawer (items → delivery details).
 * Step 1 has ZERO inputs so mobile never pops the keyboard / autofill bar on open.
 */
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
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<CartStep>("cart");
  const coordsReady = hasValidCoords(draft);
  const grandTotal = subtotal + deliveryFee;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("cart");
      return;
    }

    setStep("cart");
    // Kill any keyboard / autofill that was open before the drawer.
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel itself (not an input) so VoiceOver/TalkBack work without keyboard.
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  const sheet = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55"
        aria-label={t("common.cancel")}
        onClick={onClose}
      />

      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex w-full max-w-lg flex-col outline-none",
          "max-h-[min(86dvh,40rem)] overflow-hidden rounded-t-3xl",
          "border border-slate-200 bg-white text-slate-900 shadow-2xl",
          "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50",
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-3 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-amber-600 uppercase">
              {step === "cart" ? t("menu.cart") : t("menu.checkout")}
            </p>
            <h2 id={titleId} className="font-heading text-lg font-bold leading-tight">
              {step === "cart"
                ? dineInLabel
                  ? t("menu.checkoutTitleDineIn")
                  : t("menu.cart")
                : dineInLabel
                  ? t("menu.checkoutTitleDineIn")
                  : t("menu.checkoutTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t("menu.checkoutHint", {
                count: itemCount,
                total: `${formatMoney(grandTotal)} ${t("menu.currency")}`,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.cancel")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
          {dineInLabel && step === "cart" ? (
            <p className="rounded-2xl bg-amber-400/15 px-3 py-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
              {t("menu.dineInBanner", { table: dineInLabel })}
            </p>
          ) : null}

          {step === "cart" ? (
            <>
              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <article
                      key={group.storeId}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        {group.storeLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.storeLogoUrl}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-full bg-amber-400/20 text-amber-700">
                            <Store className="size-3.5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{group.storeName}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatMoney(group.subtotal)} {t("menu.currency")}
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {group.lines.map((line) => (
                          <li key={line.lineKey} className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{line.name}</span>
                              {line.optionSummary ? (
                                <span className="block truncate text-[11px] text-slate-500">
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
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-700">
                    <ShoppingBag className="size-5" />
                  </span>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {t("menu.empty")}
                  </p>
                </div>
              )}

              {itemCount > 0 ? (
                <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("menu.subtotal")}</span>
                    <span className="font-semibold">
                      {formatMoney(subtotal)} {t("menu.currency")}
                    </span>
                  </div>
                  {dineInLabel ? null : (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t("menu.deliveryFee")}</span>
                      <span className="font-semibold">
                        {formatMoney(deliveryFee)} {t("menu.currency")}
                      </span>
                    </div>
                  )}
                  {dineInLabel || stopCount <= 1 ? null : (
                    <p className="text-[11px] text-slate-500">
                      {t("menu.multiStopFee", {
                        stops: stopCount,
                        km: distanceKm.toFixed(1),
                      })}
                    </p>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-heading text-base font-bold dark:border-slate-800">
                    <span>{t("menu.grandTotal")}</span>
                    <span>
                      {formatMoney(grandTotal)} {t("menu.currency")}
                    </span>
                  </div>
                </div>
              ) : null}

              {itemCount > 0 ? (
                confirmClear ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 dark:border-rose-900 dark:bg-rose-950/40">
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
                  <button
                    type="button"
                    onClick={onClear}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-rose-600"
                  >
                    <Trash2 className="size-4" />
                    {t("menu.clearCart")}
                  </button>
                )
              ) : null}
            </>
          ) : (
            <>
              {dineInLabel ? (
                <>
                  <label className="block space-y-1.5 text-xs font-medium text-slate-500">
                    {t("menu.guestName")}
                    <input
                      value={draft.guestName}
                      onChange={(event) => onChange({ guestName: event.target.value })}
                      placeholder={t("menu.guestNameHint")}
                      className={fieldClass}
                      maxLength={80}
                      autoComplete="name"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-slate-500">
                    {t("menu.guestPhone")}
                    <input
                      value={draft.phone}
                      onChange={(event) => onChange({ phone: event.target.value })}
                      inputMode="tel"
                      placeholder={t("menu.guestPhoneHint")}
                      className={fieldClass}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-slate-500">
                    {t("menu.kitchenNotes")}
                    <input
                      value={groups[0] ? (storeNotes[groups[0].storeId] ?? "") : ""}
                      onChange={(event) => {
                        if (groups[0]) {
                          onNote(groups[0].storeId, event.target.value);
                        }
                      }}
                      placeholder={t("menu.kitchenNotesHint")}
                      className={fieldClass}
                      maxLength={500}
                    />
                  </label>
                  <p className="rounded-2xl bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {t("menu.payAtCounterHint")}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-700">
                      {locating ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <MapPin className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {coordsReady ? t("menu.locationReady") : t("menu.detectingLocation")}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                        {composeDeliveryAddress(draft) || t("menu.addressMissing")}
                      </p>
                    </div>
                  </div>

                  <Button variant="outline" className="h-11 w-full" onPress={onLocate} isDisabled={locating}>
                    {locating ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Navigation className="size-4" />
                    )}
                    {t("menu.useGps")}
                  </Button>

                  <label className="block space-y-1.5 text-xs font-medium text-slate-500">
                    {t("menu.street")}
                    <input
                      value={draft.street}
                      onChange={(event) => onChange({ street: event.target.value })}
                      placeholder={t("menu.streetHint")}
                      className={fieldClass}
                      autoComplete="street-address"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-slate-500">
                    {t("menu.apartment")}
                    <input
                      value={draft.apartment}
                      onChange={(event) => onChange({ apartment: event.target.value })}
                      placeholder={t("menu.apartmentHint")}
                      className={fieldClass}
                      autoComplete="off"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-slate-500">
                    {t("menu.notes")}
                    <input
                      value={draft.notes}
                      onChange={(event) => onChange({ notes: event.target.value })}
                      placeholder={t("menu.notesHint")}
                      className={fieldClass}
                      autoComplete="off"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-slate-500">
                    {t("menu.phone")}
                    <input
                      value={draft.phone}
                      onChange={(event) => onChange({ phone: event.target.value })}
                      inputMode="tel"
                      className={fieldClass}
                      autoComplete="tel"
                    />
                  </label>

                  {groups.map((group) => (
                    <label
                      key={group.storeId}
                      className="block space-y-1.5 text-xs font-medium text-slate-500"
                    >
                      {t("menu.storeNotes")} · {group.storeName}
                      <input
                        value={storeNotes[group.storeId] ?? ""}
                        onChange={(event) => onNote(group.storeId, event.target.value)}
                        placeholder={t("menu.storeNotesHint")}
                        className={fieldClass}
                        maxLength={500}
                        autoComplete="off"
                      />
                    </label>
                  ))}
                </>
              )}

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-5 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950">
          {step === "cart" ? (
            itemCount > 0 ? (
              <button
                type="button"
                onClick={() => setStep("checkout")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/25"
              >
                {t("menu.continueCheckout")}
                <ChevronRight className="size-4 rtl:rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
              >
                {t("common.close")}
              </button>
            )
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const active = document.activeElement;
                  if (active instanceof HTMLElement) {
                    active.blur();
                  }
                  setStep("cart");
                }}
                className="h-12 shrink-0 rounded-2xl border border-slate-200 px-4 text-sm font-semibold dark:border-slate-700"
              >
                {t("menu.backToCart")}
              </button>
              <Button
                className="h-12 flex-1 rounded-2xl bg-amber-400 text-sm font-bold text-slate-900 hover:bg-amber-400/90"
                onPress={onConfirm}
                isDisabled={pending}
              >
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {dineInLabel ? t("menu.sendToKitchen") : t("menu.confirmOrder")}
              </Button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );

  return createPortal(sheet, document.body);
}
