"use client";

import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { usePreferencesStore } from "@/features/recommendation/preferences.store";
import { formatManwon } from "@/lib/formatting";

function SummaryRow({ label, value }: { label: string; value: string }) {
  const empty = value === "—";
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={empty ? "text-border-strong" : "text-right font-semibold text-fg"}>{value}</dd>
    </div>
  );
}

function moodLabel(target: number | null): string {
  if (target === null) return "상관없음";
  if (target < 0.35) return `조용 쪽 ${Math.round(target * 100)}`;
  if (target > 0.65) return `번화 쪽 ${Math.round(target * 100)}`;
  return `적당 ${Math.round(target * 100)}`;
}

export function PreferenceSummarySidebar() {
  const preferences = usePreferencesStore();
  const education =
    preferences.eduEnabled === null
      ? "—"
      : preferences.eduEnabled
        ? preferences.eduCategories.length > 0
          ? `${preferences.eduCategories.length}개 시설`
          : "필요함"
        : "필요 없음";

  return (
    <aside
      className="hidden rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-24 lg:block"
      aria-label="생활 취향 입력 요약"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
        <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden />
        내 선호 요약
      </h2>
      <dl className="mt-3 divide-y divide-border/70">
        <SummaryRow
          label="예산"
          value={
            preferences.maxDeposit !== null && preferences.maxMonthlyRent !== null
              ? `보증 ${formatManwon(preferences.maxDeposit)} · 월 ${formatManwon(preferences.maxMonthlyRent)}`
              : "—"
          }
        />
        <SummaryRow
          label="희망 지역"
          value={
            preferences.anyRegion
              ? "부산 전체"
              : preferences.gungus.length > 0
                ? preferences.gungus.join(", ")
                : "—"
          }
        />
        <SummaryRow
          label="자주 가는 곳"
          value={preferences.frequent.length > 0 ? `${preferences.frequent.length}곳` : "—"}
        />
        <SummaryRow
          label="기반시설"
          value={preferences.infraCategories.length > 0 ? `${preferences.infraCategories.length}개` : "—"}
        />
        <SummaryRow label="돌봄·교육" value={education} />
        <SummaryRow
          label="취향 가게"
          value={preferences.storeChips.length > 0 ? preferences.storeChips.join(", ") : "—"}
        />
        <SummaryRow label="동네 분위기" value={moodLabel(preferences.moodTarget)} />
      </dl>
      <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-4 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        건너뛴 질문의 가중치는 남은 답변 비중대로 자동 재분배돼요.
      </p>
    </aside>
  );
}
