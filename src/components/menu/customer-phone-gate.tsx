"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import {
  CUSTOMER_AUTH_EVENT,
  CUSTOMER_READY_EVENT,
  type CustomerProfile,
} from "@/lib/auth/customer-client";
import type { Locale } from "@/lib/localized";
import {
  readCheckoutDraft,
  writeCheckoutDraft,
} from "@/lib/stores/menu-checkout";

const copy: Record<
  Locale,
  {
    title: string;
    body: string;
    name: string;
    phone: string;
    submit: string;
    working: string;
    close: string;
    invalid: string;
    staff: string;
    unavailable: string;
  }
> = {
  ar: {
    title: "أكمل بياناتك",
    body: "الاسم ورقم الجوال مطلوبان قبل إتمام الطلب.",
    name: "الاسم الكامل",
    phone: "رقم الجوال",
    submit: "متابعة",
    working: "جاري الحفظ…",
    close: "إغلاق",
    invalid: "اكتب الاسم ورقم جوال صحيح.",
    staff: "هذا الرقم لحساب موظفين. استخدم دخول الموظفين.",
    unavailable: "تعذر الحفظ الآن.",
  },
  en: {
    title: "Your details",
    body: "Full name and mobile number are required before placing an order.",
    name: "Full name",
    phone: "Mobile number",
    submit: "Continue",
    working: "Saving…",
    close: "Close",
    invalid: "Enter your name and a valid mobile number.",
    staff: "This number belongs to a staff account.",
    unavailable: "Could not save right now.",
  },
};

export function CustomerPhoneGate(): ReactElement | null {
  const { locale } = useLocale();
  const pathname = usePathname() ?? "";
  const text = copy[locale];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Account page owns profile editing — never stack this gate there.
  const onAccount = pathname.includes("/menu/account");

  useEffect(() => {
    if (onAccount && open) {
      setOpen(false);
    }
  }, [onAccount, open]);

  useEffect(() => {
    const draft = readCheckoutDraft();
    if (draft.guestName) {
      setName(draft.guestName);
    }
    if (draft.phone) {
      setPhone(draft.phone);
    }

    const onRequest = (): void => {
      if (pathname.includes("/menu/account")) {
        return;
      }
      setOpen(true);
    };
    window.addEventListener(CUSTOMER_AUTH_EVENT, onRequest);
    return () => window.removeEventListener(CUSTOMER_AUTH_EVENT, onRequest);
  }, [pathname]);

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
          setError(text.staff);
        } else if (body.error === "unavailable") {
          setError(text.unavailable);
        } else {
          setError(text.invalid);
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
      setError(text.unavailable);
    } finally {
      setWorking(false);
    }
  };

  if (onAccount) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <motion.form
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onSubmit={(event) => void onSubmit(event)}
            className="glass-strong w-full max-w-md rounded-3xl p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold">{text.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{text.body}</p>
              </div>
              <button
                type="button"
                aria-label={text.close}
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <label className="block text-xs text-muted-foreground">
              {text.name}
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary"
              />
            </label>
            <label className="mt-3 block text-xs text-muted-foreground">
              {text.phone}
              <input
                required
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary"
              />
            </label>
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={working}
              className="mt-4 h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {working ? text.working : text.submit}
            </button>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
