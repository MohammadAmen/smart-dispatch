import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { VendorLoginForm } from "@/components/vendor/vendor-login-form";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "دخول التاجر",
  description: "بوابة BEEV للتاجر لإدارة الطلبات والمنتجات ومنيو المتجر.",
};

export default async function VendorLoginPage(): Promise<ReactElement> {
  const session = await readSession();
  if (session && (session.role === "STORE_OWNER" || isSuperAdminRole(session.role))) {
    redirect("/vendor/dashboard");
  }

  return <VendorLoginForm />;
}
