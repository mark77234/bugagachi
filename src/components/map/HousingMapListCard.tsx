"use client";

import Link from "next/link";
import { Building2, ChevronRight, MapPin, Sparkles, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { bestCondition, type HousingUnit } from "@/mocks/housing";
import type { MarkerTier } from "@/components/map/MapView";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";

const STATUS = {
  open: { tone: "success" as const, label: "모집 중" },
  upcoming: { tone: "primary" as const, label: "모집 예정" },
  closed: { tone: "neutral" as const, label: "마감" },
  unknown: { tone: "neutral" as const, label: "공고 확인 필요" },
};

/** 지도 마커 색상과 같은 기준으로 카드에도 구분 표시를 남긴다. */
const TIER_STYLE: Record<Exclude<MarkerTier, "normal">, { ring: string; chip: string; icon: typeof Star }> = {
  recommend: {
    ring: "border-primary/45",
    chip: "bg-primary-subtle text-primary",
    icon: Star,
  },
  ai: {
    ring: "border-[#7c3aed]/45",
    chip: "bg-[#f3ebff] text-[#6d28d9]",
    icon: Sparkles,
  },
};

/**
 * 지도 목록 카드. 카드 자체가 "지도에서 보기" 역할을 한다 (클릭 → 마커 선택 + 지도 이동).
 * 상세 페이지는 우측 하단 링크로 분리해 카드 클릭과 겹치지 않게 한다.
 */
export function HousingMapListCard({
  unit,
  selected,
  onSelect,
  tier = "normal",
  rank,
  reason,
  onHover,
}: {
  unit: HousingUnit;
  selected: boolean;
  onSelect: () => void;
  /** 마커와 동일한 구분(취향 추천 / AI 갈붕 추천). */
  tier?: MarkerTier;
  /** 취향 추천 순위 */
  rank?: number;
  /** 추천 근거 한 줄 */
  reason?: string;
  onHover?: (hovering: boolean) => void;
}) {
  const condition = bestCondition(unit);
  const status = STATUS[unit.recruitStatus];
  const reduceMotion = useReducedMotion();
  const tierStyle = tier === "normal" ? null : TIER_STYLE[tier];
  const TierIcon = tierStyle?.icon;

  return (
    <motion.article
      data-map-unit={unit.id}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "scroll-mt-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface shadow-[var(--shadow-sm)] transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/25"
          : tierStyle
            ? `${tierStyle.ring} hover:border-primary/50`
            : "border-border hover:border-primary/40",
      )}
    >
      {/* 카드 본문 전체가 지도 이동 버튼 */}
      <button
        type="button"
        onClick={onSelect}
        onFocus={() => onHover?.(true)}
        onBlur={() => onHover?.(false)}
        aria-pressed={selected}
        aria-label={`${unit.name} 지도에서 보기`}
        className="w-full p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--color-ring)]"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {tierStyle && TierIcon && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                tierStyle.chip,
              )}
            >
              <TierIcon className="h-3 w-3" aria-hidden />
              {tier === "ai" ? "AI 갈붕 추천" : rank ? `취향 추천 ${rank}위` : "취향 추천"}
            </span>
          )}
          <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[unit.type]}</Badge>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <h3 className="mt-2 text-base font-bold text-navy sm:text-lg">{unit.name}</h3>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0">{unit.address}</span>
        </p>

        {reason && <p className="mt-2 text-xs font-medium text-primary">{reason}</p>}

        <dl className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 rounded-[var(--radius-input)] bg-surface-muted/70 px-3 py-2.5 text-sm">
          <div>
            <dt className="text-xs text-muted">보증금</dt>
            <dd className="font-semibold tabular-nums text-fg">
              {condition ? formatManwon(condition.deposit) : "미공개"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">월 임대료</dt>
            <dd className="font-bold tabular-nums text-primary">
              {condition ? formatManwon(condition.monthlyRent) : "미공개"}
            </dd>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted">
            <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            {unit.supplyCount}세대
          </div>
        </dl>
      </button>

      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs font-medium text-muted">{selected ? "지도에 표시 중" : "카드를 누르면 지도로 이동해요"}</span>
        <Link
          href={`/housing/${unit.id}`}
          className="inline-flex items-center gap-0.5 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          상세 보기 <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </motion.article>
  );
}
