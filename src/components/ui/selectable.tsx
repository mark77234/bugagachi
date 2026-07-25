"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
  /** 값이 다른 입력에서 자동 결정될 때(예: 나이로 판정되는 계층) 잠근다. */
  disabled?: boolean;
}

const gridCols = (columns: number) =>
  columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

const cardBase =
  "relative flex min-h-[56px] w-full items-center gap-3 rounded-[var(--radius-choice)] border-2 bg-surface p-4 text-left cursor-pointer transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)]";
const cardIdle = "border-border hover:border-primary/50 hover:bg-surface-muted";
const cardOn = "border-primary bg-primary-subtle shadow-[0_0_0_3px_var(--color-primary-subtle)]";
const focusRing =
  "peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-ring)]";

function Mark({ on, shape }: { on: boolean; shape: "radio" | "check" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
        shape === "radio" ? "rounded-full" : "rounded-[6px]",
        on ? "border-primary bg-primary text-white" : "border-border bg-surface",
      )}
    >
      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

/** 단일 선택 카드 그룹 (native radio). fieldset/legend는 호출부에서 감싼다. */
export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
  columns = 2,
}: {
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: Option<T>[];
  columns?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={cn("grid gap-3", gridCols(columns))}>
      {options.map((o) => {
        const on = value === o.value;
        const Icon = o.icon;
        return (
          <label key={o.value} className="block">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={on}
              onChange={() => onChange(o.value)}
              className="sr-only peer"
            />
            <motion.span
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className={cn(cardBase, on ? cardOn : cardIdle, focusRing)}
            >
              <Mark on={on} shape="radio" />
              {Icon && <Icon className={cn("h-5 w-5 shrink-0", on ? "text-primary" : "text-muted")} />}
              <span className="min-w-0">
                <span className={cn("block font-semibold", on ? "text-primary" : "text-fg")}>{o.label}</span>
                {o.description && <span className="mt-0.5 block text-sm text-muted">{o.description}</span>}
              </span>
            </motion.span>
          </label>
        );
      })}
    </div>
  );
}

/** 다중 선택 카드/칩 그룹 (native checkbox). */
export function CheckCards<T extends string>({
  values,
  onToggle,
  options,
  columns = 2,
}: {
  values: T[];
  onToggle: (v: T) => void;
  options: Option<T>[];
  columns?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={cn("grid gap-3", gridCols(columns))}>
      {options.map((o) => {
        const on = values.includes(o.value);
        const Icon = o.icon;
        return (
          <label key={o.value} className="block">
            <input
              type="checkbox"
              checked={on}
              disabled={o.disabled}
              onChange={() => onToggle(o.value)}
              className="sr-only peer"
            />
            <motion.span
              whileTap={reduceMotion || o.disabled ? undefined : { scale: 0.98 }}
              className={cn(
                cardBase,
                on ? cardOn : cardIdle,
                focusRing,
                o.disabled && "cursor-not-allowed opacity-70 hover:border-border hover:bg-surface",
              )}
            >
              <Mark on={on} shape="check" />
              {Icon && <Icon className={cn("h-5 w-5 shrink-0", on ? "text-primary" : "text-muted")} />}
              <span className="min-w-0">
                <span className={cn("block font-medium", on ? "text-primary" : "text-fg")}>{o.label}</span>
                {o.description && <span className="mt-0.5 block text-sm text-muted">{o.description}</span>}
              </span>
            </motion.span>
          </label>
        );
      })}
    </div>
  );
}
