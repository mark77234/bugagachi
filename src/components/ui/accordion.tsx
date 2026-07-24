import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** 접이식 설명 ("왜 필요한 정보인가요?" 등). 네이티브 details 기반 → 키보드 접근 기본 지원. */
export function InfoAccordion({
  summary,
  children,
  className,
}: {
  summary: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group rounded-[var(--radius-input)] border border-border bg-surface-muted/60", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
        <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
        {summary}
        <ChevronDown className="ml-auto h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 pb-4 pt-0 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}
