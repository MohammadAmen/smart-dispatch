import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CustomerPhoneGate } from "@/components/menu/customer-phone-gate";

export const metadata: Metadata = {
  applicationName: "BEEV",
  manifest: "/menu.webmanifest",
  description: "منيو BEEV: شعار المتاجر، البحث، والمتاجر القريبة.",
};

export default function MenuLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      {children}
      <CustomerPhoneGate />
    </>
  );
}
