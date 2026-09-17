"use client";

import { AnimatePresence, m } from "framer-motion";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { MenuCheckoutSheet } from "@/components/menu/menu-checkout-sheet";
import { useLocale } from "@/components/providers/locale-provider";
import { planPickupRoute } from "@/lib/stores/delivery-fee";
import { cartTotals, groupCartByStore, MENU_CART_KEY } from "@/lib/stores/menu-cart";
import { composeDeliveryAddress, type MenuCheckoutDraft } from "@/lib/stores/menu-checkout";
import { rememberTrackingToken } from "@/lib/stores/menu-track-store";
import { formatMoney } from "@/lib/stores/pricing";
import { customerOrderTrackingPath } from "@/lib/stores/public-url";
import { useMenuCartStore } from "@/stores/menu-cart-store";

export function MenuPersistentCart({
  draft,
  locating,
  checkoutOpen,
  onDraftChange,
  onLocate,
  onCheckoutOpenChange,
  dineIn,
}: {
  draft: MenuCheckoutDraft;
  locating: boolean;
  checkoutOpen: boolean;
  onDraftChange: (patch: Partial<MenuCheckoutDraft>) => void;
  onLocate: () => void;
  onCheckoutOpenChange: (open: boolean) => void;
  dineIn?: { storeId: string; tableId: string; tableLabel: string } | null;
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const lines = useMenuCartStore((state) => state.lines);
  const storeNotes = useMenuCartStore((state) => state.storeNotes);
  const hydrated = useMenuCartStore((state) => state.hydrated);
  const hydrate = useMenuCartStore((state) => state.hydrate);
  const increase = useMenuCartStore((state) => state.increase);
  const remove = useMenuCartStore((state) => state.remove);
  const setNote = useMenuCartStore((state) => state.setNote);
  const clear = useMenuCartStore((state) => state.clear);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [placedNumber, setPlacedNumber] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
    const onStorage = (event: StorageEvent): void => {
      if (event.key === MENU_CART_KEY) {
        hydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrate]);

  useEffect(() => {
    if (lines.length === 0) {
      setConfirmClear(false);
    }
  }, [lines.length]);

  const visibleLines = useMemo(
    () => (dineIn ? lines.filter((line) => line.storeId === dineIn.storeId) : lines),
    [dineIn, lines],
  );
  const groups = useMemo(() => groupCartByStore(visibleLines), [visibleLines]);
  const totals = useMemo(() => cartTotals(visibleLines), [visibleLines]);
  const quote = useMemo(
    () =>
      planPickupRoute(
        groups.map((group) => ({
          id: group.storeId,
          name: group.storeName,
          latitude: group.storeLat,
          longitude: group.storeLng,
        })),
        draft.latitude != null && draft.longitude != null
          ? { latitude: draft.latitude, longitude: draft.longitude }
          : null,
      ),
    [draft.latitude, draft.longitude, groups],
  );

  const placeOrder = async (): Promise<void> => {
    const addressText = dineIn ? dineIn.tableLabel : composeDeliveryAddress(draft);
    if (!dineIn && (!draft.phone.trim() || !addressText)) {
      setError(t("menu.addressMissing"));
      onCheckoutOpenChange(true);
      return;
    }
    if (!addressText) {
      setError(t("menu.addressMissing"));
      onCheckoutOpenChange(true);
      return;
    }
    if (visibleLines.length === 0) {
      onCheckoutOpenChange(false);
      setError(null);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: draft.phone,
          addressText,
          latitude: draft.latitude,
          longitude: draft.longitude,
          items: visibleLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            optionValueIds: line.optionValueIds,
            note: line.note,
          })),
          storeNotes,
          fulfillment: dineIn ? "DINE_IN" : "DELIVERY",
          tableId: dineIn?.tableId ?? null,
          tableLabel: dineIn?.tableLabel ?? null,
          guestName: dineIn ? draft.guestName.trim() || null : null,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        orderNumber?: string;
        trackingToken?: string;
      };
      if (!body.ok || !body.orderNumber || !body.trackingToken) {
        setError(body.error ?? t("menu.placeFailed"));
        return;
      }
      clear();
      setPlacedNumber(body.orderNumber);
      onCheckoutOpenChange(false);
      rememberTrackingToken(body.trackingToken);
      if (!dineIn) {
        window.setTimeout(() => {
          router.push(customerOrderTrackingPath(body.trackingToken as string));
        }, 700);
      }
    } catch {
      setError(t("menu.placeFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {hydrated && totals.itemCount > 0 ? (
          <m.div
            initial={{ y: 88, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 88, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={() => onCheckoutOpenChange(true)}
              className="glass-strong flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start shadow-[0_18px_40px_-24px_oklch(0.2_0.08_195/0.55)]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShoppingBag className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">
                  {t("menu.cartCount", { count: totals.itemCount })}
                  {groups.length > 1 ? ` · ${t("menu.storeCount", { count: groups.length })}` : ""}
                </span>
                <span className="block font-heading text-base font-semibold">
                  {formatMoney(totals.subtotal + (dineIn ? 0 : quote.fee))} {t("menu.currency")}
                </span>
              </span>
              <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                {t("menu.checkout")}
              </span>
            </button>
          </m.div>
        ) : null}
      </AnimatePresence>

      <MenuCheckoutSheet
        open={checkoutOpen}
        draft={draft}
        groups={groups}
        storeNotes={storeNotes}
        subtotal={totals.subtotal}
        deliveryFee={dineIn ? 0 : quote.fee}
        dineInLabel={dineIn?.tableLabel}
        distanceKm={quote.distanceKm}
        stopCount={quote.stopCount}
        itemCount={totals.itemCount}
        locating={locating}
        pending={pending}
        error={error}
        confirmClear={confirmClear}
        onClose={() => onCheckoutOpenChange(false)}
        onChange={onDraftChange}
        onNote={setNote}
        onIncrease={increase}
        onDecrease={remove}
        onLocate={onLocate}
        onConfirm={() => {
          void placeOrder();
        }}
        onClear={() => setConfirmClear(true)}
        onConfirmClear={() => {
          clear();
          setConfirmClear(false);
          onCheckoutOpenChange(false);
        }}
        onCancelClear={() => setConfirmClear(false)}
      />

      <AnimatePresence>
        {placedNumber ? (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-success/30 bg-background/95 px-4 py-3 shadow-lg"
          >
            <CheckCircle2 className="size-5 text-success" />
            <p className="text-sm font-medium">
              {dineIn
                ? t("menu.dineInPlaced", { orderNumber: placedNumber })
                : t("menu.placed", { orderNumber: placedNumber })}
            </p>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
