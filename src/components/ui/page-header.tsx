import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps): ReactNode {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-[1.7rem]">
          {title}
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}
