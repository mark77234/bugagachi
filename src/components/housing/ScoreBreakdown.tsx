"use client";

import { AXIS_LABEL, type CategoryScore } from "@/features/recommendation/recommendation.types";

/** 항목별 점수 분해 — 점수 막대 + 원본 값(거리/개수/백분위) 병기. 색 단독 금지(수치 텍스트 동반). */
export function ScoreBreakdown({ byAxis }: { byAxis: CategoryScore[] }) {
  if (byAxis.length === 0) {
    return <p className="text-sm text-muted">취향 설문을 완료하면 항목별 점수가 표시돼요.</p>;
  }
  return (
    <ul className="space-y-4">
      {byAxis.map((a) => {
        const pct = Math.round(a.score * 100);
        return (
          <li key={a.axis}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-fg">
                {AXIS_LABEL[a.axis]}
                <span className="ml-2 text-xs text-muted">가중치 {Math.round(a.weight * 100)}%</span>
              </span>
              <span className="font-semibold text-navy">{pct}점</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${AXIS_LABEL[a.axis]} ${pct}점`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{a.raw}</p>
          </li>
        );
      })}
    </ul>
  );
}
