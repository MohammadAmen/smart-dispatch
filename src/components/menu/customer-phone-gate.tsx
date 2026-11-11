"use client";

import { AnimatePresence, m } from "framer-motion";
import { LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

import { BrandMark } from "@/components/brand/brand-mark";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_AUTH_EVENT,
  CUSTOMER_READY_EVENT,
  fetchCustomerProfile,
  type CustomerProfile,
} from "@/lib/auth/customer-client";
import {
  readCheckoutDraft,
  writeCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import { useMenuUiStore } from "@/stores/menu-ui-store";

/**
 * Mandatory first-entry profile gate for the customer menu.
 * Opens as soon as the menu loads if name/phone are missing — never under the cart.
 */
export function CustomerPhoneGate(): ReactElement | null {
  const { t, locale } = useLocale();
  const pathname = usePathname() ?? "";
  const titleId = useId();
  const closeCart = useMenuUiStore((state) => state.closeCart);
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [required, setRequired] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const bootedRef = useRef(false);

  const onAccount = pathname.includes("/menu/account");

  const openGate = useCallback((mode: "required" | "resume"): void => {
    if (typeof window !== "undefined" && window.location.pathname.includes("/menu/account")) {
      return;
    }
    closeCart();
    const draft = readCheckoutDraft();
    if (draft.guestName) {
      setName(draft.guestName);
    }
    if (draft.phone) {
      setPhone(draft.phone);
    }
    setRequired(mode === "required");
    setError(null);
    setOpen(true);
  }, [closeCart]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (onAccount && open) {
      setOpen(false);
    }
  }, [onAccount, open]);

  useEffect(() => {
    if (!mounted || onAccount || bootedRef.current) {
      if (onAccount) {
        setChecking(false);
      }
      return;
    }
    bootedRef.current = true;

    let cancelled = false;
    const boot = async (): Promise<void> => {
      const profile = await fetchCustomerProfile();
      if (cancelled) {
        return;
      }
      if (profile?.name && profile.phone) {
        const draft = readCheckoutDraft(profile.phone);
        writeCheckoutDraft({
          ...draft,
          phone: profile.phone,
          guestName: profile.name,
        });
        setOpen(false);
        setChecking(false);
        return;
      }
      openGate("required");
      setChecking(false);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [mounted, onAccount, openGate]);

  useEffect(() => {
    const onRequest = (): void => {
      openGate("required");
    };
    window.addEventListener(CUSTOMER_AUTH_EVENT, onRequest);
    return () => window.removeEventListener(CUSTOMER_AUTH_EVENT, onRequest);
  }, [openGate]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        user?: CustomerProfile;
      };
      if (!body.ok || !body.user) {
        if (body.error === "staff-phone") {
          setError(t("menu.phoneGate.staff"));
        } else if (body.error === "unavailable") {
          setError(t("menu.phoneGate.unavailable"));
        } else {
          setError(t("menu.phoneGate.invalid"));
        }
        return;
      }
      const draft = readCheckoutDraft(body.user.phone);
      writeCheckoutDraft({
        ...draft,
        phone: body.user.phone,
        guestName: body.user.name,
      });
      window.dispatchEvent(
        new CustomEvent<CustomerProfile>(CUSTOMER_READY_EVENT, { detail: body.user }),
      );
      setOpen(false);
    } catch {
      setError(t("menu.phoneGate.unavailable"));
    } finally {
      setWorking(false);
    }
  };

  if (!mounted || onAccount || checking || !open) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <m.div
        key="customer-phone-gate"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[420] flex items-end justify-center sm:items-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#f59e0b33,transparent_55%),linear-gradient(180deg,#020617f2,#0f172af5)]" />

        <m.form
          initial={{ y: 48, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 28, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onSubmit={(event) => void onSubmit(event)}
          className="relative z-10 mb-0 w-full max-w-md overflow-hidden rounded-t-[2rem] border border-white/10 bg-[linear-gradient(165deg,#111827_0%,#020617_55%,#0b1220_100%)] px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-[0_-40px_100px_-24px_rgba(245,158,11,0.35)] sm:mb-6 sm:rounded-[2rem]"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-[1.35rem] bg-amber-400/15 ring-1 ring-amber-300/35">
              <BrandMark size={40} rounded={false} className="h-10 w-10 border-0 shadow-none" />
            </div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-amber-300 uppercase">
              <Sparkles className="size-3.5" />
              BEEV
            </p>
            <h2 id={titleId} className="mt-2 font-heading text-[1.65rem] font-bold tracking-tight">
              {t("menu.phoneGate.title")}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
              {t("menu.phoneGate.body")}
            </p>
            {required ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-amber-100/90 ring-1 ring-white/10">
                <LockKeyhole className="size-3.5" />
                {t("menu.phoneGate.requiredHint")}
              </p>
            ) : null}
          </div>

          <div className="relative mt-6 space-y-3">
            <label className="block text-start text-xs font-medium text-slate-400">
              {t("menu.phoneGate.name")}
              <span className="mt-1.5 flex h-12 items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-3 focus-within:border-amber-300/70 focus-within:ring-2 focus-within:ring-amber-300/25">
                <UserRound className="size-4 shrink-0 text-amber-300/90" />
                <input
                  required
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("menu.phoneGate.nameHint")}
                  className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </span>
            </label>

            <label className="block text-start text-xs font-medium text-slate-400">
              {t("menu.phoneGate.phone")}
              <span className="mt-1.5 flex h-12 items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-3 focus-within:border-amber-300/70 focus-within:ring-2 focus-within:ring-amber-300/25">
                <span className="text-sm font-semibold text-amber-300/90" dir="ltr">
                  +
                </span>
                <input
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("menu.phoneGate.phoneHint")}
                  className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  dir="ltr"
                />
              </span>
            </label>

            {error ? (
              <p className="rounded-2xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-center text-sm text-rose-100">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              isDisabled={working}
              className="mt-2 h-13 w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
            >
              {working ? t("menu.phoneGate.working") : t("menu.phoneGate.submit")}
            </Button>
          </div>
        </m.form>
      </m.div>
    </AnimatePresence>,
    document.body,
  );
}
