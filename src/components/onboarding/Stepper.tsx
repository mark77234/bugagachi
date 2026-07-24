"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  key: string;
  badge: string;
  label: string;
}

/** 가로형 단계 진행 표시. 현재=강조, 완료=체크, 이후=연한 색. */
export function Stepper({
  steps,
  currentKey,
  completedKeys,
}: {
  steps: Step[];
  currentKey: string;
  completedKeys: string[];
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey);

  return (
    <div>
      {/* 모바일 축약 */}
      <p className="mb-1 text-sm font-medium text-muted sm:hidden" aria-live="polite">
        <span className="font-bold text-primary">{steps[currentIndex]?.badge}</span> · {currentIndex + 1} / {steps.length}단계 —{" "}
        {steps[currentIndex]?.label}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted sm:hidden" aria-hidden>
        <div
          className="h-full origin-left rounded-full bg-primary transition-transform duration-[var(--duration-standard)]"
          style={{ transform: `scaleX(${(currentIndex + 1) / steps.length})` }}
        />
      </div>

      <ol className="hidden items-center gap-2 sm:flex" aria-label="진행 단계">
        {steps.map((s, i) => {
          const done = completedKeys.includes(s.key);
          const active = s.key === currentKey;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                  active && "border-primary bg-primary text-white",
                  done && !active && "border-primary bg-primary-subtle text-primary",
                  !done && !active && "border-border bg-surface text-muted",
                )}
              >
                {done && !active ? <Check className="h-4 w-4" strokeWidth={3} /> : s.badge}
              </span>
              <span className={cn("text-sm font-medium", active ? "text-navy" : "text-muted")}>{s.label}</span>
              {i < steps.length - 1 && (
                <span className={cn("mx-1 h-px flex-1", done ? "bg-primary/40" : "bg-border")} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
