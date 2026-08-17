"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  applyLocale,
  DEFAULT_LOCALE,
  isLocale,
  localeDirection,
  LOCALE_STORAGE_KEY,
} from "@/i18n/config";
import { dictionaries, translate, type Messages } from "@/i18n/dictionaries";
import type { Locale } from "@/lib/localized";

const LOCALE_EVENT = "sd-locale-change";

function readLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(stored)) {
    return stored;
  }

  return isLocale(document.documentElement.lang)
    ? document.documentElement.lang
    : DEFAULT_LOCALE;
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(LOCALE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(LOCALE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

interface LocaleContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  messages: Messages;
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}): ReactNode {
  const locale = useSyncExternalStore(
    subscribe,
    readLocale,
    () => initialLocale,
  );
  const messages = dictionaries[locale];
  const dir = localeDirection[locale];

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string =>
      translate(messages, path, vars),
    [messages],
  );

  const setLocale = useCallback((next: Locale): void => {
    applyLocale(next);
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir, messages, t, setLocale }),
    [dir, locale, messages, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
