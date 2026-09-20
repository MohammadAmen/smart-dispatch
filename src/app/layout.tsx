import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import { Cairo, Geist_Mono } from "next/font/google";

import { LocaleProvider } from "@/components/providers/locale-provider";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeDirection,
  LOCALE_COOKIE,
} from "@/i18n/config";
import { THEME_COOKIE, THEME_RESOLVED_COOKIE, themeFromCookies } from "@/lib/theme";
import { cn } from "@/lib/utils";

import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Smart Dispatch",
    template: "%s · Smart Dispatch",
  },
  description:
    "مركز قيادة لوجستي يعمل أولاً دون اتصال لإدارة الأسطول والتوصيل في الوقت الفعلي.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1610" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const theme = themeFromCookies(
    cookieStore.get(THEME_COOKIE)?.value,
    cookieStore.get(THEME_RESOLVED_COOKIE)?.value,
  );

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      data-theme={theme}
      className={cn(
        cairo.variable,
        geistMono.variable,
        "h-full antialiased",
        theme === "dark" && "dark",
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
