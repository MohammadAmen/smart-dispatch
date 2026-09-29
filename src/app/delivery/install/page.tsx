import type { Metadata } from "next";
import type { ReactElement } from "react";

import { DeliveryInstallView } from "@/components/delivery/delivery-install-view";

export const metadata: Metadata = {
  title: "تثبيت تطبيق المندوب",
  description: "صفحة مستقلة لانضمام مندوب التوصيل وتثبيت الدخول إلى حسابه.",
};

export default function DeliveryInstallPage(): ReactElement {
  return <DeliveryInstallView />;
}
