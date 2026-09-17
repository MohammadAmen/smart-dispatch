"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { ProductEditorModal } from "@/components/stores/product-editor-modal";
import { useLocale } from "@/components/providers/locale-provider";
import { FadeIn } from "@/components/ui/fade-in";
import { PageHeader } from "@/components/ui/page-header";
import type { CategoryRecord, StoreRecord } from "@/lib/stores/types";

export function VendorProductCreateBoard({
  store,
  categories,
  draftName = "",
}: {
  store: StoreRecord | null;
  categories: CategoryRecord[];
  draftName?: string;
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.addProduct")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  return (
    <FadeIn className="space-y-6">
      <PageHeader title={t("vendor.addProduct")} description={t("vendor.optionGroupsHint")} />
      <ProductEditorModal
        open
        embedded
        storeId={store.id}
        categories={categories}
        product={null}
        draftName={draftName}
        pending={false}
        onClose={() => router.push("/vendor/products")}
        onSaved={() => router.push("/vendor/products")}
      />
    </FadeIn>
  );
}
