import type { ReactNode } from "react";
import type { Viewport } from "next";

import { DriverShell } from "@/components/driver/driver-shell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function DriverLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <DriverShell>{children}</DriverShell>;
}
