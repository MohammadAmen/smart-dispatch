"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useLocale } from "@/components/providers/locale-provider";
import { registerOfflineWorker } from "@/lib/offline/register-sw";
import type { Locale } from "@/lib/localized";

const DISMISS_KEY = "beev-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const copy: Record<Locale, { title: string; action: string; later: string }> = {
  ar: {
    title: "ثبّت تطبيق BEEV على جهازك",
    action: "تثبيت",
    later: "لاحقاً",
  },
  en: {
    title: "Install the BEEV app",
    action: "Install",
    later: "Not now",
  },
};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaInstallPrompt(): ReactElement | null {
  const { locale } = useLocale();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const text = copy[locale];

  useEffect(() => {
    void registerOfflineWorker();

    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") {
      return;
    }

    const onPrompt = (event: Event): void => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = (): void => {
    localStorage.setItem(DISMISS_KEY, "1");
    setPromptEvent(null);
  };

  const install = async (): Promise<void> => {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setPromptEvent(null);
  };

  return (
    <AnimatePresence>
      {promptEvent ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="glass-strong fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_18px_40px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
        >
          <Download className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm font-medium">{text.title}</p>
          <button
            type="button"
            onClick={() => {
              void install();
            }}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
          >
            {text.action}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={text.later}
            className="rounded-full p-1 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
