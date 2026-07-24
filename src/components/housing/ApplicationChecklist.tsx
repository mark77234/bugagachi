"use client";

import { motion } from "motion/react";
import { Check, ListChecks } from "lucide-react";
import { useUserStore } from "@/features/user/user.store";
import { applicationChecklist } from "@/features/housing/checklist";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import { cn } from "@/lib/utils";

const EMPTY_CHECKS: string[] = [];

/** 신청 준비 체크리스트 — 유형별 준비 항목을 체크(로컬 저장). 진행률 표시. */
export function ApplicationChecklist({ housingId, type }: { housingId: string; type: EligibilityTypeCode }) {
  const items = applicationChecklist(type);
  const storedChecks = useUserStore((s) => s.applicationChecks[housingId]);
  const checked = storedChecks ?? EMPTY_CHECKS;
  const toggleCheck = useUserStore((s) => s.toggleCheck);
  const done = items.filter((i) => checked.includes(i.id)).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden /> 준비 완료 {done}/{items.length}
        </span>
        <span className="text-sm font-semibold text-primary">{pct}%</span>
      </div>
      <div
        className="mb-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="신청 준비 진행률"
      >
        <motion.div
          className="h-full origin-left rounded-full bg-primary"
          initial={false}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const on = checked.includes(item.id);
          return (
            <li key={item.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[var(--radius-input)] border p-3 transition-colors",
                  on ? "border-primary/40 bg-primary-subtle/60" : "border-border hover:bg-surface-muted",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleCheck(housingId, item.id)}
                  className="sr-only peer"
                />
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-ring)]",
                    on ? "border-primary bg-primary text-white" : "border-border bg-surface",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-medium", on ? "text-primary" : "text-fg")}>
                    {item.label}
                  </span>
                  {item.hint && <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
