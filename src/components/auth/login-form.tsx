"use client";

import { m } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { homePathForRole } from "@/lib/auth/constants";
import { loginRequest } from "@/lib/auth/client";
import {
  BRAND_CHEF_LOCKUP_SRC,
  BRAND_LOGIN_BG_SRC,
  BRAND_NAME,
} from "@/lib/brand";
import { isSafeInternalPath, withLocalePrefix } from "@/lib/paths";
import { cn } from "@/lib/utils";

const fieldShell =
  "flex h-12 items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition focus-within:border-amber-400 focus-within:ring-3 focus-within:ring-amber-400/25 dark:border-slate-700 dark:bg-slate-950/80";

const fieldInput =
  "h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100";

export function LoginForm(): ReactNode {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const isArabic = locale === "ar";

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

    const next = searchParams.get("next");
    const decoded = next ? decodeURIComponent(next) : null;
    const destination = isSafeInternalPath(decoded)
      ? withLocalePrefix(decoded, locale)
      : homePathForRole(result.user.role, locale);

    router.replace(destination);
    router.refresh();
  };

  return (
    <MotionProvider>
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_LOGIN_BG_SRC}
          alt=""
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,253,248,0.28),transparent_58%)]" />
        <div className="absolute inset-0 bg-slate-950/10 dark:bg-slate-950/45" />

        <div className="absolute end-4 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/70 p-1 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70">
          <LocaleToggle />
          <ThemeToggle />
        </div>

        <m.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[22.5rem]"
        >
          <div className="mb-5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_CHEF_LOCKUP_SRC}
              alt={BRAND_NAME}
              width={220}
              height={148}
              className="h-[6.75rem] w-auto max-w-[14rem] object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.28)] sm:h-[7.5rem] sm:max-w-[15.5rem]"
              draggable={false}
            />
          </div>

          <div
            className={cn(
              "rounded-[1.75rem] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]",
              "backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/90 sm:p-7",
            )}
          >
            <div className="text-center">
              <h1 className="font-heading text-[1.65rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                {t("login.title")}
              </h1>
              <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t("login.description")}
              </p>
            </div>

            <form className="mt-7 space-y-3.5" onSubmit={onSubmit}>
              <label className={fieldShell}>
                <UserRound className="size-[1.15rem] shrink-0 text-slate-400" aria-hidden />
                <input
                  type="text"
                  name="email"
                  inputMode="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("login.email")}
                  className={fieldInput}
                  aria-label={t("login.email")}
                />
              </label>

              <label className={fieldShell}>
                <Lock className="size-[1.15rem] shrink-0 text-slate-400" aria-hidden />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("login.password")}
                  className={fieldInput}
                  aria-label={t("login.password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </label>

              {error ? (
                <p className="px-1 text-center text-sm text-rose-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={working}
                className={cn(
                  "mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full",
                  "bg-linear-to-r from-amber-400 via-amber-400 to-orange-400",
                  "text-sm font-extrabold text-slate-900",
                  "shadow-[0_14px_28px_-12px_rgba(245,158,11,0.75)]",
                  "transition hover:brightness-[1.03] active:scale-[0.99]",
                  "disabled:pointer-events-none disabled:opacity-60",
                )}
              >
                <span>{working ? t("login.working") : t("login.submit")}</span>
                {working ? null : isArabic ? (
                  <ArrowLeft className="size-4" aria-hidden />
                ) : (
                  <ArrowRight className="size-4" aria-hidden />
                )}
              </button>
            </form>
          </div>
        </m.div>
      </div>
    </MotionProvider>
  );
}
