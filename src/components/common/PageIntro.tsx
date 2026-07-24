import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageIntro({
  eyebrow,
  title,
  description,
  badge,
  actions,
  compact = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <header className={cn(compact ? "mb-5" : "mb-8", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {eyebrow && <p className="text-sm font-bold text-primary">{eyebrow}</p>}
        {badge}
      </div>
      <div className={cn("mt-2 flex flex-col gap-4", actions && "sm:flex-row sm:items-end sm:justify-between")}>
        <div className="max-w-3xl">
          <h1 tabIndex={-1} className={cn("font-bold tracking-tight text-navy outline-none", compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl")}>
            {title}
          </h1>
          {description && (
            <p className={cn("text-pretty max-w-2xl text-muted", compact ? "mt-2 text-base" : "mt-3 text-base sm:text-lg")}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
