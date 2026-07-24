import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
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
      <header className="border-b border-border bg-surface">
        <PageContainer size="wide" className="flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25"
            aria-label="부가가치 홈으로 이동"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-white">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-lg font-extrabold tracking-[-0.03em]">부가가치</span>
          </Link>
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
