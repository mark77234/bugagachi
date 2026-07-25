"use client";

import { Banknote, Building2, FileCheck2, MapPinned, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DetailTabKey = "price" | "eligibility" | "house" | "area" | "trust";

const TABS: { key: DetailTabKey; label: string; icon: LucideIcon }[] = [
  { key: "price", label: "임대조건", icon: Banknote },
  { key: "eligibility", label: "입주자격", icon: FileCheck2 },
  { key: "house", label: "주택정보", icon: Building2 },
  { key: "area", label: "주변환경", icon: MapPinned },
  { key: "trust", label: "리뷰·출처", icon: ShieldCheck },
];

/** 상세 페이지 섹션 탭. 내용이 길어 한 화면에 다 담지 않고 묶음으로 나눠 보여준다. */
export function DetailTabs({
  value,
  onChange,
}: {
  value: DetailTabKey;
  onChange: (key: DetailTabKey) => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 bg-bg/92 px-1 py-2 backdrop-blur">
      <div
        role="tablist"
        aria-label="주택 상세 정보 분류"
        className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-sm)]"
      >
        {TABS.map((tab) => {
          const active = tab.key === value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              className={cn(
                "flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-ring)]",
                active ? "bg-primary text-white" : "text-muted hover:bg-primary-subtle hover:text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
