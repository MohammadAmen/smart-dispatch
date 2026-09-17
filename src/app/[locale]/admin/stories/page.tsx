import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { AdminStoriesBoard } from "@/components/stores/admin-stories-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { listAdminStories } from "@/lib/stores/story-service";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleAdminStoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect(`/${locale}/login`);
  }

  const stories = await listAdminStories();
  return <AdminStoriesBoard stories={stories} />;
}
