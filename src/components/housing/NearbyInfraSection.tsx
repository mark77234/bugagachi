"use client";

import { Baby, Hospital, ShoppingCart, Store, Train, Trees, BookOpen, Dumbbell, School } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  detailInfraFor,
  infraCategoryLabel,
  REQUIRED_LABEL,
  EDUCATION_LABEL,
  type NearbyPoi,
} from "@/features/infra/nearby-infra";
import type { EduCategory, InfraCategory } from "@/features/recommendation/recommendation.types";
import type { HousingMetric } from "@/mocks/housing";
import { formatDistance } from "@/lib/formatting";
import { cn } from "@/lib/utils";

const REQUIRED_ICON: Record<InfraCategory, LucideIcon> = {
  HOSPITAL: Hospital,
  MART: ShoppingCart,
  PARK: Trees,
  LIBRARY: BookOpen,
  SPORTS: Dumbbell,
  SUBWAY: Train,
};

const EDUCATION_ICON: Record<EduCategory, LucideIcon> = {
  DAYCARE: Baby,
  KINDER: School,
  ELEM: School,
  MIDDLE: School,
  HIGH: School,
};

const REQUIRED_ORDER: InfraCategory[] = ["SUBWAY", "MART", "HOSPITAL", "PARK", "LIBRARY", "SPORTS"];
const EDUCATION_ORDER: EduCategory[] = ["DAYCARE", "KINDER", "ELEM", "MIDDLE", "HIGH"];

/** 카테고리별 가장 가까운 POI 1곳. */
function firstByCategory(list: NearbyPoi[]): Map<string, NearbyPoi> {
  const map = new Map<string, NearbyPoi>();
  for (const poi of list) if (!map.has(poi.category)) map.set(poi.category, poi);
  return map;
}

function InfraRow({
  icon: Icon,
  label,
  poi,
  fallback,
  emphasized,
}: {
  icon: LucideIcon;
  label: string;
  poi?: NearbyPoi;
  /** 수집 반경 밖이라 이름이 없을 때 쓰는 사전계산 거리. */
  fallback?: HousingMetric | null;
  emphasized: boolean;
}) {
  const distance = poi?.distance ?? fallback?.distance ?? null;
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        emphasized ? "bg-surface" : "bg-surface-muted/40",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          emphasized ? "bg-primary-subtle text-primary" : "bg-surface text-muted",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-xs", emphasized ? "font-bold text-primary" : "text-muted")}>{label}</span>
        <span className="block truncate text-sm font-semibold text-fg">
          {poi ? poi.name : distance != null ? "가장 가까운 곳" : "반경 안에 없어요"}
          {poi?.detail && <span className="ml-1 text-xs font-normal text-muted">{poi.detail}</span>}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">
        {distance != null ? formatDistance(distance) : "—"}
      </span>
    </li>
  );
}

/**
 * 상세 페이지 주변 인프라.
 * 원본 인프라는 16만 건이라 건물별 근접 POI만 사전계산해 쓰고, 목록은 티어별로 개수를 제한한다.
 *  · 1순위(필수 인프라) — 강조
 *  · 돌봄·교육 — 설문에서 필요하다고 답했을 때만
 *  · 2순위(취향 가게) — 약하게
 */
export function NearbyInfraSection({
  unitId,
  includeEducation,
  infraFallback,
  educationFallback,
}: {
  unitId: string;
  includeEducation: boolean;
  infraFallback: Record<string, HousingMetric | null>;
  educationFallback: Record<string, HousingMetric | null>;
}) {
  const infra = detailInfraFor(unitId, { includeEducation });
  const required = firstByCategory(infra.required);
  const education = firstByCategory(infra.education);

  const FALLBACK_KEY: Record<InfraCategory, string> = {
    HOSPITAL: "hospital",
    MART: "mart",
    PARK: "park",
    LIBRARY: "library",
    SPORTS: "sports",
    SUBWAY: "subway",
  };
  const EDU_FALLBACK_KEY: Record<EduCategory, string> = {
    DAYCARE: "daycare",
    KINDER: "kindergarten",
    ELEM: "elementary",
    MIDDLE: "middle",
    HIGH: "high",
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-navy">
          필수 인프라
          <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-bold text-primary">1순위</span>
        </h3>
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-input)] border border-border">
          {REQUIRED_ORDER.map((category) => (
            <InfraRow
              key={category}
              icon={REQUIRED_ICON[category]}
              label={REQUIRED_LABEL[category]}
              poi={required.get(category)}
              fallback={infraFallback[FALLBACK_KEY[category]]}
              emphasized
            />
          ))}
        </ul>
      </div>

      {includeEducation && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-navy">돌봄 · 교육</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-input)] border border-border">
            {EDUCATION_ORDER.map((category) => (
              <InfraRow
                key={category}
                icon={EDUCATION_ICON[category]}
                label={EDUCATION_LABEL[category]}
                poi={education.get(category)}
                fallback={educationFallback[EDU_FALLBACK_KEY[category]]}
                emphasized
              />
            ))}
          </ul>
        </div>
      )}

      {infra.preference.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-navy">
            걸어서 갈 수 있는 가게
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-muted">2순위</span>
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-input)] border border-border">
            {infra.preference.map((poi) => (
              <InfraRow
                key={poi.id}
                icon={Store}
                label={infraCategoryLabel(poi)}
                poi={poi}
                emphasized={false}
              />
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            업종별로 가장 가까운 한 곳만 보여드려요. 실제 점포 수는 아래 표를 참고하세요.
          </p>
        </div>
      )}
    </div>
  );
}
