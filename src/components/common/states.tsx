"use client";

import { Inbox, RefreshCw, TriangleAlert, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function Shell({
  icon: Icon,
  spin,
  title,
  description,
  children,
  live,
}: {
  icon: LucideIcon;
  spin?: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  live?: "polite" | "assertive";
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface px-6 py-12 text-center"
      aria-live={live}
    >
      <Icon className={`mb-3 h-9 w-9 text-muted ${spin ? "animate-spin" : ""}`} aria-hidden />
      <p className="text-lg font-semibold text-navy">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Shell icon={Inbox} title={title} description={description}>
      {action}
    </Shell>
  );
}

export function LoadingState({ title = "불러오는 중이에요", description }: { title?: string; description?: string }) {
  return <Shell icon={Loader2} spin title={title} description={description} live="polite" />;
}

export function ErrorState({
  title = "문제가 발생했어요",
  description = "잠시 후 다시 시도해 주세요.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Shell icon={TriangleAlert} title={title} description={description} live="assertive">
      {onRetry && (
        <Button variant="outline" size="md" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> 다시 시도
        </Button>
      )}
    </Shell>
  );
}
