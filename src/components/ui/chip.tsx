"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** 토글형 칩 (다중 선택). */
export function ToggleChip({
  label,
  selected,
  onToggle,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-base font-medium transition-colors",
        selected
          ? "border-primary bg-primary-subtle text-primary"
          : "border-border bg-surface text-fg hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-45 hover:bg-surface",
      )}
    >
      {selected && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
      {label}
    </button>
  );
}

/** 제거 가능한 태그 칩 (직접 입력 결과 등). */
export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-subtle px-3 py-1.5 text-sm text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 제거`}
        className="rounded-full p-0.5 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
