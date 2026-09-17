import type { ReactNode } from "react";

import { MenuOrderTracker } from "@/components/stores/menu-order-tracker";
import { MotionProvider } from "@/components/providers/motion-provider";

export const dynamic = "force-dynamic";

export default async function MenuOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): Promise<ReactNode> {
  const { token } = await searchParams;

  return (
    <MotionProvider>
      <div className="ambient-mesh min-h-dvh">
        <MenuOrderTracker initialToken={token?.trim() ?? ""} />
      </div>
    </MotionProvider>
  );
}
