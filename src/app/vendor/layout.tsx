import type { ReactNode } from "react";

import { VendorShell } from "@/components/layout/vendor-shell";
import { loadVendorShell } from "@/lib/stores/vendor-access";

export default async function VendorLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
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
