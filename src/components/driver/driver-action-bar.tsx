"use client";

import { m } from "framer-motion";
import { CheckCircle2, Navigation, PackageCheck } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { DriverAssignment } from "@/lib/driver/types";

type DriverActionKind = "accept" | "inTransit" | "delivered";

interface DriverActionBarProps {
  assignment: DriverAssignment;
  accepted: boolean;
  busy: boolean;
  onAction: (kind: DriverActionKind) => void;
}

export function DriverActionBar({
  assignment,
  accepted,
  busy,
  onAction,
}: DriverActionBarProps): ReactNode {
  const { t } = useLocale();

  const kind: DriverActionKind =
    assignment.status === "IN_TRANSIT"
      ? "delivered"
      : accepted
        ? "inTransit"
        : "accept";

  const label =
    kind === "delivered"
      ? t("driver.delivered")
      : kind === "inTransit"
        ? t("driver.inTransit")
        : t("driver.accept");

  const Icon =
    kind === "delivered"
      ? PackageCheck
      : kind === "inTransit"
        ? Navigation
        : CheckCircle2;

  return (
    <div className="sticky bottom-0 z-30 border-t bg-background/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <m.div layout>
        <Button
          isDisabled={busy}
          onPress={() => onAction(kind)}
          className="h-16 w-full touch-manipulation rounded-2xl text-lg font-bold shadow-[0_16px_40px_-18px_oklch(0.55_0.16_195)]"
        >
          {busy ? (
            t("driver.working")
          ) : (
            <>
              <Icon data-icon="inline-start" className="size-6" />
              {label}
            </>
          )}
        </Button>
      </m.div>
    </div>
  );
}

export type { DriverActionKind };
