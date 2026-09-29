import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  applicationName: "BEEV",
  manifest: "/menu.webmanifest",
  description: "منيو BEEV: شعار المتاجر، البحث، والمتاجر القريبة.",
};

export default function LocaleMenuLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
