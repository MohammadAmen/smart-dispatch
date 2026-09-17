"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VendorOrderFilter } from "@/lib/stores/order-status";
import {
  paginationRange,
  vendorOrdersHref,
  type VendorOrderSource,
} from "@/lib/stores/vendor-order-query";
import { cn } from "@/lib/utils";

export function VendorOrdersPagination({
  pathname,
  page,
  pageSize,
  total,
  status,
  orderSource,
}: {
  pathname: string;
  page: number;
  pageSize: number;
  total: number;
  status: VendorOrderFilter;
  orderSource: VendorOrderSource;
}): ReactNode {
  const { t } = useLocale();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = paginationRange(page, totalPages);

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("vendor.pageSummary", { from, to, total })}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {page > 1 ? (
          <Link
            href={vendorOrdersHref(pathname, { page: page - 1, status, orderSource })}
            scroll={false}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ChevronRight className="size-3.5 rtl:rotate-180" />
            {t("vendor.prevPage")}
          </Link>
        ) : (
          <Button variant="outline" size="sm" isDisabled>
            <ChevronRight className="size-3.5 rtl:rotate-180" />
            {t("vendor.prevPage")}
          </Button>
        )}
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`e-${index}`} className="px-1.5 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={vendorOrdersHref(pathname, { page: item, status, orderSource })}
              scroll={false}
              className={cn(
                buttonVariants({ variant: item === page ? "default" : "outline", size: "sm" }),
                "min-w-8",
              )}
            >
              {item}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link
            href={vendorOrdersHref(pathname, { page: page + 1, status, orderSource })}
            scroll={false}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("vendor.nextPage")}
            <ChevronLeft className="size-3.5 rtl:rotate-180" />
          </Link>
        ) : (
          <Button variant="outline" size="sm" isDisabled>
            {t("vendor.nextPage")}
            <ChevronLeft className="size-3.5 rtl:rotate-180" />
          </Button>
        )}
      </div>
    </div>
  );
}
