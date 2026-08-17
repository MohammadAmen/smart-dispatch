import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function LocaleOpsLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <DashboardShell>{children}</DashboardShell>;
}
