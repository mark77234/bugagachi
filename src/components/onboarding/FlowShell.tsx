import type { ReactNode } from "react";
import { PageContainer } from "@/components/common/PageContainer";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { cn } from "@/lib/utils";

export function FlowShell({
  eyebrow,
  title,
  description,
  progress,
  aside,
  children,
  footer,
  narrow = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  progress?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-surface-muted/45">
      <header className="border-b border-border bg-surface/90 backdrop-blur">
        <PageContainer size="wide" className="flex min-h-16 items-center justify-between gap-4">
          <BrandLogo logoClassName="h-8" titleClassName="h-6" />
          <p className="text-sm font-semibold text-muted">{eyebrow}</p>
        </PageContainer>
      </header>

      <PageContainer size={narrow ? "narrow" : "wide"} className="py-6 sm:py-8">
        <div className="mb-5">
          <h1 className="text-balance text-2xl font-extrabold tracking-[-0.025em] text-navy sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p>
        </div>
        {progress && <div className="mb-6">{progress}</div>}
        <div className={cn(aside && "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]")}>
          <div className="min-w-0">{children}</div>
          {aside}
        </div>
        {footer}
      </PageContainer>
    </div>
  );
}
