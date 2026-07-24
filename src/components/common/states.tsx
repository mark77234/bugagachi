"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot, type MascotPose } from "@/components/common/Mascot";

function Shell({
  pose,
  float,
  title,
  description,
  children,
  live,
}: {
  pose: MascotPose;
  float?: boolean;
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
      <Mascot pose={pose} float={float} className="mb-4 h-28 w-28" sizes="112px" />
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
  pose = "confused",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  pose?: MascotPose;
}) {
  return (
    <Shell pose={pose} title={title} description={description}>
      {action}
    </Shell>
  );
}

export function LoadingState({
  title = "불러오는 중이에요",
  description,
  pose = "thinking",
}: {
  title?: string;
  description?: string;
  pose?: MascotPose;
}) {
  return <Shell pose={pose} float title={title} description={description} live="polite" />;
}

export function ErrorState({
  title = "문제가 발생했어요",
  description = "잠시 후 다시 시도해 주세요.",
  onRetry,
  pose = "alert",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  pose?: MascotPose;
}) {
  return (
    <Shell pose={pose} title={title} description={description} live="assertive">
      {onRetry && (
        <Button variant="outline" size="md" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> 다시 시도
        </Button>
      )}
    </Shell>
  );
}
