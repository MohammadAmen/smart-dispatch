import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";

import { LocaleProvider } from "@/components/providers/locale-provider";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeDirection,
  LOCALE_BOOTSTRAP_SCRIPT,
  LOCALE_COOKIE,
} from "@/i18n/config";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      data-theme="light"
      className={`${cairo.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `${THEME_BOOTSTRAP_SCRIPT}${LOCALE_BOOTSTRAP_SCRIPT}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
