import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CustomerPhoneGate } from "@/components/menu/customer-phone-gate";
import { MenuChrome } from "@/components/menu/menu-chrome";

export const metadata: Metadata = {
  applicationName: "BEEV",
  manifest: "/menu.webmanifest",
  description: "منيو BEEV: شعار المتاجر، البحث، والمتاجر القريبة.",
};

export default function MenuLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <MenuChrome>
      {children}
      <CustomerPhoneGate />
    </MenuChrome>
  );
}
