import { headers } from "next/headers";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { VendorShell } from "@/components/layout/vendor-shell";
import { isVendorLoginPath, PATHNAME_HEADER } from "@/lib/pwa/surface";
import { loadVendorShell } from "@/lib/stores/vendor-access";

export const metadata: Metadata = {
  applicationName: "BEEV تاجر",
  manifest: "/vendor.webmanifest",
  description: "بوابة BEEV للتاجر: الطلبات، المنتجات، ومنيو المتجر.",
};

export default async function VendorLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "";
  if (isVendorLoginPath(pathname)) {
    return children;
  }

  const shell = await loadVendorShell("/login");
  return (
    <VendorShell
      storeId={shell.storeId}
      storeType={shell.storeType}
      storeActive={shell.storeActive}
      storePhone={shell.storePhone}
    >
      {children}
    </VendorShell>
  );
}
