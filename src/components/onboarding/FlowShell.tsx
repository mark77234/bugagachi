import type { ReactNode } from "react";
import { PageContainer } from "@/components/common/PageContainer";
import { PageIntro } from "@/components/common/PageIntro";
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
    <PageContainer size={narrow ? "narrow" : "wide"} className="py-6 sm:py-8">
      <PageIntro eyebrow={eyebrow} title={title} description={description} compact />
      {progress && <div className="mb-5">{progress}</div>}
      <div className={cn(aside && "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="min-w-0">{children}</div>
        {aside}
      </div>
      {footer}
    </PageContainer>
  );
}
