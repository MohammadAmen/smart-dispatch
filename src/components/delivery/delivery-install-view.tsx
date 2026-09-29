"use client";

import { Bike, MapPinned, Radio, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { DELIVERY_LOGIN_PATH } from "@/lib/delivery/install-link";
import type { Locale } from "@/lib/localized";

interface InstallCopy {
  kicker: string;
  title: string;
  body: string;
  features: { title: string; detail: string }[];
  action: string;
  note: string;
}

const copy: Record<Locale, InstallCopy> = {
  ar: {
    kicker: "تطبيق المندوب",
    title: "انضم إلى أسطول التوصيل",
    body: "صفحة مستقلة للمندوب: ثبّت الدخول، استلم الطلبات، وحدّث حالة التوصيل من جوالك.",
    features: [
      {
        title: "طلبات واردة فوراً",
        detail: "يظهر الطلب الجديد كتنبيه حتى القبول أو الرفض.",
      },
      {
        title: "مسار الاستلام والتسليم",
        detail: "عنوان العميل ونقاط المسار في شاشة واحدة.",
      },
      {
        title: "موقع مباشر",
        detail: "شارك موقعك أثناء الخدمة لرسم مسار التوصيل.",
      },
      {
        title: "يعمل مع شبكة ضعيفة",
        detail: "تُحفظ التحديثات على الجهاز وتُزامَن عند عودة الاتصال.",
      },
    ],
    action: "تثبيت ودخول المندوب",
    note: "الدخول مخصص لحساب المندوب.",
  },
  en: {
    kicker: "Driver app",
    title: "Join the delivery fleet",
    body: "A standalone page for drivers: install access, receive jobs, and update delivery status from your phone.",
    features: [
      {
        title: "Incoming jobs",
        detail: "A new order alerts you until you accept or decline.",
      },
      {
        title: "Pickup and drop-off",
        detail: "Customer address and route stops on one screen.",
      },
      {
        title: "Live location",
        detail: "Share your position while you are on duty.",
      },
      {
        title: "Weak-network ready",
        detail: "Updates stay on the device and sync when you are back online.",
      },
    ],
    action: "Install and sign in",
    note: "Sign-in is for driver accounts.",
  },
};

const featureIcons = [Radio, MapPinned, Bike, WifiOff] as const;

export function DeliveryInstallView(): ReactElement {
  const { locale } = useLocale();
  const text = copy[locale];

  return (
    <main className="relative min-h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.16),transparent_55%)]" />
      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col px-5 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <img
            src={BRAND_LOGO_SRC}
            alt={BRAND_NAME}
            className="h-16 w-auto object-contain"
          />
          <p className="mt-6 text-xs font-semibold tracking-[0.28em] text-amber-400 uppercase">
            {text.kicker}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
            {text.title}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">{text.body}</p>
        </motion.div>

        <ul className="mt-8 space-y-3">
          {text.features.map((feature, index) => {
            const Icon = featureIcons[index] ?? Radio;
            return (
              <motion.li
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{feature.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{feature.detail}</span>
                </span>
              </motion.li>
            );
          })}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mt-8"
        >
          <Link
            href={DELIVERY_LOGIN_PATH}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-amber-400 text-base font-bold text-slate-950 shadow-[0_18px_40px_-18px_rgba(245,158,11,0.85)] transition-colors hover:bg-amber-300"
          >
            {text.action}
          </Link>
          <p className="mt-3 text-center text-xs text-slate-500">{text.note}</p>
        </motion.div>
      </div>
    </main>
  );
}
