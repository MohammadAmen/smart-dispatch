"use client";

import { Bell } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/localized";

const copy: Record<Locale, { title: string; empty: string }> = {
  ar: { title: "مركز الإشعارات", empty: "لا توجد إشعارات غير مقروءة." },
  en: { title: "Notification center", empty: "No unread notifications." },
};

export function NotificationCenter(): ReactElement {
  const { locale } = useLocale();
  const text = copy[locale];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void import("@/lib/notifications/native-push")
      .then((mod) => mod.clearAppBadge())
      .finally(() => setReady(true));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Bell className="size-5" aria-hidden />
        </span>
        <h1 className="font-heading text-2xl font-bold">{text.title}</h1>
      </div>
      <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        {ready ? text.empty : "…"}
      </p>
    </main>
  );
}
