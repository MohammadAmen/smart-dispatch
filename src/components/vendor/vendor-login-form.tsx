"use client";

import { ClipboardList, Package, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { isSuperAdminRole, homePathForRole } from "@/lib/auth/constants";
import { loginRequest } from "@/lib/auth/client";
import { withLocalePrefix } from "@/lib/paths";
import type { Locale } from "@/lib/localized";

const copy: Record<
  Locale,
  { kicker: string; title: string; body: string; email: string; password: string; submit: string; working: string; points: string[] }
> = {
  ar: {
    kicker: "بوابة التاجر",
    title: "دخول المتجر",
    body: "بعد التثبيت أو الفتح تدخل مباشرة لإدارة الطلبات والمنتجات ومنيو متجرك.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submit: "دخول",
    working: "جاري الدخول…",
    points: ["الطلبات", "المنتجات", "منيو المتجر"],
  },
  en: {
    kicker: "Vendor portal",
    title: "Store sign-in",
    body: "After install or open, go straight to your orders, products, and store menu.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    working: "Signing in…",
    points: ["Orders", "Products", "Store menu"],
  },
};

const pointIcons = [ClipboardList, Package, UtensilsCrossed] as const;

export function VendorLoginForm(): ReactElement {
  const { locale, t } = useLocale();
  const router = useRouter();
  const text = copy[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setWorking(true);
    setError(null);

    const result = await loginRequest(email, password);
    if (!result.ok) {
      setError(result.error === "Invalid credentials." ? t("login.invalid") : result.error);
      setWorking(false);
      return;
    }

    const destination =
      result.user.role === "STORE_OWNER" || isSuperAdminRole(result.user.role)
        ? withLocalePrefix("/vendor/dashboard", locale)
        : homePathForRole(result.user.role, locale);

    router.replace(destination);
    router.refresh();
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex items-center gap-3">
          <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} className="h-12 w-auto object-contain" />
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">{text.kicker}</p>
            <h1 className="font-heading text-2xl font-bold text-white">{text.title}</h1>
          </div>
        </div>
        <p className="mb-4 text-sm leading-6 text-slate-300">{text.body}</p>
        <ul className="mb-5 flex gap-2">
          {text.points.map((point, index) => {
            const Icon = pointIcons[index] ?? ClipboardList;
            return (
              <li
                key={point}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-slate-300"
              >
                <Icon className="size-3.5 text-amber-400" aria-hidden />
                {point}
              </li>
            );
          })}
        </ul>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
          <label className="block text-xs text-slate-400">
            {text.email}
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus-visible:border-amber-400"
            />
          </label>
          <label className="block text-xs text-slate-400">
            {text.password}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus-visible:border-amber-400"
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={working}
            className="h-12 w-full rounded-xl bg-amber-400 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-60"
          >
            {working ? text.working : text.submit}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
