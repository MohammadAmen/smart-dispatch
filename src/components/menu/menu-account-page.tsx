"use client";

import {
  Check,
  Languages,
  Monitor,
  Moon,
  Pencil,
  Phone,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { useLocale } from "@/components/providers/locale-provider";
import {
  fetchCustomerProfile,
  type CustomerProfile,
} from "@/lib/auth/customer-client";
import {
  readCheckoutDraft,
  writeCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import {
  applyTheme,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_EVENT = "sd-theme-change";

function readTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

export function MenuAccountPage(): ReactNode {
  const { t, locale, setLocale } = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    const draft = readCheckoutDraft();
    setName(draft.guestName);
    setPhone(draft.phone);
    setTheme(readTheme());
    void fetchCustomerProfile().then((user) => {
      if (!user) {
        return;
      }
      setProfile(user);
      setName((current) => current.trim() || user.name);
      setPhone((current) => current.trim() || user.phone);
    });
  }, []);

  const saveProfile = async (): Promise<void> => {
    const nextName = name.trim();
    const nextPhone = phone.trim();
    if (nextName.length < 2 || nextPhone.length < 8) {
      setMessage(t("menu.accountInvalid"));
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, phone: nextPhone }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        user?: CustomerProfile;
      };
      if (!body.ok || !body.user) {
        setMessage(t("menu.accountSaveFailed"));
        return;
      }
      const draft = readCheckoutDraft(body.user.phone);
      writeCheckoutDraft({
        ...draft,
        phone: body.user.phone,
        guestName: body.user.name,
      });
      setProfile(body.user);
      setName(body.user.name);
      setPhone(body.user.phone);
      setEditing(false);
      setMessage(t("menu.accountSaved"));
    } catch {
      setMessage(t("menu.accountSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const setThemePref = (next: ThemePreference): void => {
    applyTheme(next);
    setTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const themeOptions: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
    { id: "light", label: t("menu.themeLight"), icon: Sun },
    { id: "dark", label: t("menu.themeDark"), icon: Moon },
    { id: "system", label: t("menu.themeSystem"), icon: Monitor },
  ];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-[#FFFDF9] dark:bg-background">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 pb-4 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center gap-3">
          <BrandMark size={48} rounded={false} className="size-12 rounded-2xl border-0 shadow-none" />
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-50">
              {t("menu.navAccount")}
            </h1>
            <p className="text-xs text-slate-500">{t("menu.accountSubtitle")}</p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-5">
        <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-700">
              <UserRound className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t("menu.accountProfile")}
              </p>
              <p className="text-[11px] text-slate-500">{t("menu.accountProfileHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing((value) => !value);
                setMessage(null);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <Pencil className="size-3.5" />
              {editing ? t("common.cancel") : t("common.edit")}
            </button>
          </div>

          <div className="space-y-3 px-4 py-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">{t("menu.guestName")}</span>
              <input
                value={name}
                readOnly={!editing}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus-visible:border-amber-400 focus-visible:ring-3 focus-visible:ring-amber-400/25 read-only:opacity-70 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">{t("menu.phone")}</span>
              <span className="relative block">
                <Phone className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={phone}
                  readOnly={!editing}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  dir="ltr"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 ps-10 pe-3 text-sm font-medium outline-none focus-visible:border-amber-400 focus-visible:ring-3 focus-visible:ring-amber-400/25 read-only:opacity-70 dark:border-slate-700 dark:bg-slate-900"
                />
              </span>
            </label>
            {editing ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void saveProfile();
                }}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/25 disabled:opacity-60"
              >
                <Check className="size-4" />
                {saving ? t("common.loading") : t("common.save")}
              </button>
            ) : null}
            {message ? <p className="text-center text-xs font-medium text-amber-700">{message}</p> : null}
            {!editing && !profile && !name ? (
              <p className="text-center text-xs text-slate-500">{t("menu.accountEmpty")}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("menu.appearance")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setThemePref(option.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition",
                    active
                      ? "border-amber-400 bg-amber-400/15 text-slate-900 shadow-sm dark:text-amber-200"
                      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="text-[11px] font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("common.language")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "ar" as const, label: t("common.arabic") },
              { id: "en" as const, label: t("common.english") },
            ]).map((option) => {
              const active = locale === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLocale(option.id)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                    active
                      ? "border-amber-400 bg-amber-400 text-slate-900 shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                  )}
                >
                  <Languages className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
