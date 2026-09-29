"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { GlassCard } from "@/components/ui/glass-card";
import { DELIVERY_INSTALL_PATH } from "@/lib/delivery/install-link";
import type { Locale } from "@/lib/localized";

const copy: Record<Locale, { title: string; detail: string; action: string; done: string }> = {
  ar: {
    title: "رابط تثبيت تطبيق المندوب",
    detail: "انسخ الرابط وأرسله للمندوب. يفتح صفحة التثبيت ثم دخول حساب التوصيل.",
    action: "نسخ الرابط",
    done: "تم النسخ",
  },
  en: {
    title: "Driver install link",
    detail: "Copy the link and send it to a driver. It opens the install page, then driver sign-in.",
    action: "Copy link",
    done: "Copied",
  },
};

export function DeliveryInstallLinkCard(): ReactElement {
  const { locale } = useLocale();
  const text = copy[locale];
  const [href, setHref] = useState(DELIVERY_INSTALL_PATH);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHref(`${window.location.origin}${DELIVERY_INSTALL_PATH}`);
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <GlassCard hover={false} className="mt-6 border-amber-400/25">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
          <Link2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{text.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{text.detail}</p>
          <p className="mt-3 truncate rounded-xl bg-muted px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {href}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          void copyLink();
        }}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? text.done : text.action}
      </button>
    </GlassCard>
  );
}
