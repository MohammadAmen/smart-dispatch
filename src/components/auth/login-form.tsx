"use client";

import { m } from "framer-motion";
import { Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DEMO_PASSWORD, homePathForRole } from "@/lib/auth/constants";
import { loginRequest } from "@/lib/auth/client";
import { isSafeInternalPath } from "@/lib/paths";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function LoginForm(): ReactNode {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("dana@fleet.smart-dispatch.local");
  const [password, setPassword] = useState(DEMO_PASSWORD);
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

    const next = searchParams.get("next");
    const decoded = next ? decodeURIComponent(next) : null;
    const destination = isSafeInternalPath(decoded)
      ? decoded
      : homePathForRole(result.user.role, locale);

    router.replace(destination);
    router.refresh();
  };

  return (
    <MotionProvider>
      <div className="ambient-mesh flex min-h-dvh items-center justify-center px-4 py-10">
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Truck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t("brand.name")}</p>
                <p className="text-xs text-muted-foreground">{t("brand.tagline")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </div>

          <GlassCard hover={false}>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {t("login.title")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("login.description")}</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("login.email")}</span>
                <input
                  type="text"
                  name="email"
                  inputMode="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("login.password")}
                </span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" isDisabled={working}>
                {working ? t("login.working") : t("login.submit")}
              </Button>
            </form>

            <div className="mt-5 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{t("login.demo")}</p>
              <p className="mt-1 font-mono">dana@fleet.smart-dispatch.local</p>
              <p className="font-mono">admin@fleet.smart-dispatch.local</p>
              <p className="mt-1">
                {t("login.demoPassword")}: <span className="font-mono">{DEMO_PASSWORD}</span>
              </p>
            </div>
          </GlassCard>
        </m.div>
      </div>
    </MotionProvider>
  );
}
