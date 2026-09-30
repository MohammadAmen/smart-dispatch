import type { ReactNode } from "react";

import { BeevLoader } from "@/components/brand/beev-loader";

export default function MenuLoading(): ReactNode {
  return <BeevLoader variant="page" />;
}
