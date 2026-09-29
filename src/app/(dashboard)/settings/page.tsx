"use client";

import { DeliveryInstallLinkCard } from "@/components/admin/delivery-install-link-card";
import { SettingsPage } from "@/components/settings/settings-page";

export default function SettingsRoutePage() {
  return (
    <>
      <SettingsPage />
      <DeliveryInstallLinkCard />
    </>
  );
}
