"use client";

import { INFRA_COLOR, type MapInfraPoi } from "@/components/map/MapView";

const LABEL: Record<MapInfraPoi["tier"], string> = {
  required: "필수 인프라",
  education: "돌봄·교육",
  preference: "취향 가게",
};
const ORDER: MapInfraPoi["tier"][] = ["required", "education", "preference"];

/** 선택한 주택 주변에 인프라 핀이 떠 있을 때만 보여주는 범례. 실제로 찍힌 종류만 노출한다. */
export function NearbyInfraLegend({ tiers, count }: { tiers: MapInfraPoi["tier"][]; count: number }) {
  const present = ORDER.filter((tier) => tiers.includes(tier));
  return (
    <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-border bg-surface/95 px-3 py-2 text-[11px] font-semibold shadow-[var(--shadow-card)] backdrop-blur">
      <span className="text-muted">주변 인프라 {count}곳</span>
      {present.map((tier) => (
        <span key={tier} className="flex items-center gap-1 text-fg">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border"
            style={{ background: INFRA_COLOR[tier].bg, borderColor: INFRA_COLOR[tier].border }}
            aria-hidden
          />
          {LABEL[tier]}
        </span>
      ))}
    </div>
  );
}
