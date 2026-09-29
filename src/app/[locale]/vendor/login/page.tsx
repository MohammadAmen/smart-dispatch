import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactElement } from "react";

import { VendorLoginForm } from "@/components/vendor/vendor-login-form";
import { isLocale, LOCALES } from "@/i18n/config";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "دخول التاجر",
  description: "بوابة BEEV للتاجر لإدارة الطلبات والمنتجات ومنيو المتجر.",
};

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVendorLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactElement> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const session = await readSession();
  if (session && (session.role === "STORE_OWNER" || isSuperAdminRole(session.role))) {
    redirect(`/${locale}/vendor/dashboard`);
  }

  return <VendorLoginForm />;
}
