import type { ReactNode } from "react";

import { VendorShell } from "@/components/layout/vendor-shell";
import { loadVendorShell } from "@/lib/stores/vendor-access";

export default async function LocaleVendorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  const shell = await loadVendorShell(`/${locale}/login`);
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
