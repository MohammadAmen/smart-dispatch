import type { ReactNode } from "react";
import type { Viewport } from "next";

import { DriverShell } from "@/components/driver/driver-shell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1610" },
  ],
};

export default function DriverLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <DriverShell>{children}</DriverShell>;
}
