"use client";

import { createElement, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import {
  Baby,
  Beer,
  BookOpen,
  Coffee,
  Croissant,
  Drumstick,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  Hospital,
  Library,
  MapPin,
  PencilRuler,
  School,
  Scissors,
  ShoppingBasket,
  ShoppingCart,
  Store,
  Train,
  Trees,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { INFRA_COLOR, INFRA_MARKER_ICON, type MapInfraPoi } from "@/components/map/MapView";
import { MapPanel } from "@/components/map/MapPanel";
import {
  RADIUS_BANDS,
  bandOf,
  detailInfraFor,
  infraCategoryLabel,
  REQUIRED_LABEL,
  EDUCATION_LABEL,
  type NearbyPoi,
  type RadiusBandKey,
} from "@/features/infra/nearby-infra";
import type { EduCategory, InfraCategory } from "@/features/recommendation/recommendation.types";
import type { LatLng } from "@/lib/coordinates";
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
  KINDER: Baby,
  ELEM: School,
  MIDDLE: School,
  HIGH: GraduationCap,
};

/** 2순위 취향 가게 — 2단계 Q5 칩 라벨과 1:1. 업종마다 다른 아이콘을 쓴다. */
const PREFERENCE_ICON: Record<string, LucideIcon> = {
  식당: UtensilsCrossed,
  뷰티: Scissors,
  카페: Coffee,
  "편의점/슈퍼마켓": ShoppingBasket,
  "운동/스포츠": Dumbbell,
  베이커리: Croissant,
  치킨: Drumstick,
  주점: Beer,
  "입시/예체능 학원": PencilRuler,
  "독서실/스터디카페": Library,
};

/** 카테고리에 맞는 lucide 아이콘 엘리먼트. (컴포넌트를 렌더 중에 새로 만들지 않도록 createElement 로 만든다) */
function poiIcon(poi: NearbyPoi, className: string) {
  const icon: LucideIcon =
    poi.tier === "required"
      ? REQUIRED_ICON[poi.category as InfraCategory] ?? Store
      : poi.tier === "education"
        ? EDUCATION_ICON[poi.category as EduCategory] ?? School
        : PREFERENCE_ICON[poi.category] ?? Store;
  return createElement(icon, { className, "aria-hidden": true });
}

const TIER_LABEL: Record<MapInfraPoi["tier"], string> = {
  required: "필수 인프라",
  education: "돌봄·교육",
  preference: "취향 가게",
};

type TierFilter = "all" | MapInfraPoi["tier"];

/** 지도에 동시에 찍을 인프라 핀 상한 (가까운 순). 목록은 전부 보여주고 지도만 과밀 방지용으로 제한한다. */
const MAP_PIN_LIMIT = 120;

/** 지도 마커와 같은 핀 아이콘. */
function TierPin({ tier, className = "h-5 w-5" }: { tier: MapInfraPoi["tier"]; className?: string }) {
  return (
    <Image src={INFRA_MARKER_ICON[tier]} alt="" width={64} height={64} className={cn("shrink-0 object-contain", className)} />
  );
}

/** 선택한 인프라 한 곳의 상세 카드 — 지도 위치·거리·업종을 보여준다. */
function PoiDetailCard({ poi, onClose }: { poi: NearbyPoi; onClose: () => void }) {
  const color = INFRA_COLOR[poi.tier];
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-card)] border-2 bg-surface/97 shadow-[var(--shadow-sheet)] backdrop-blur"
      style={{ borderColor: color.border }}
    >
      <div className="flex items-start gap-3 p-3.5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color.border}14`, color: color.fg }}
        >
          {poiIcon(poi, "h-5 w-5")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: color.fg }}>
            <TierPin tier={poi.tier} className="h-4 w-4" />
            {infraCategoryLabel(poi)}
            <span className="font-medium text-muted">· {TIER_LABEL[poi.tier]}</span>
          </p>
          <h4 className="mt-1 text-base font-bold text-navy">{poi.name}</h4>
          {poi.detail && <p className="mt-0.5 text-sm text-muted">{poi.detail}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold tabular-nums text-fg">
              집에서 {formatDistance(poi.distance)}
            </span>
            <span className="text-muted">걸어서 약 {Math.max(1, Math.round(poi.distance / 67))}분</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="선택 해제"
          className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <a
        href={`https://map.kakao.com/link/to/${encodeURIComponent(poi.name)},${poi.coord.lat},${poi.coord.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 border-t border-border py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
      >
        <MapPin className="h-4 w-4" aria-hidden />
        카카오맵에서 길찾기
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}

function PoiRow({
  poi,
  selected,
  onSelect,
}: {
  poi: NearbyPoi;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = INFRA_COLOR[poi.tier];
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex h-full w-full items-center gap-2.5 rounded-[var(--radius-input)] border p-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
          selected
            ? "border-primary bg-primary-subtle/60 ring-2 ring-primary/20"
            : "border-border bg-surface hover:border-primary/40 hover:bg-surface-muted/60",
        )}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color.border}14`, color: color.fg }}
        >
          {poiIcon(poi, "h-4.5 w-4.5")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-bold" style={{ color: color.fg }}>
            {infraCategoryLabel(poi)}
          </span>
          <span className="block truncate text-sm font-semibold text-fg">{poi.name}</span>
          {poi.detail && <span className="block truncate text-[11px] text-muted">{poi.detail}</span>}
        </span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{formatDistance(poi.distance)}</span>
      </button>
    </li>
  );
}

/**
 * 상세 페이지 주변 인프라 탐색기.
 *  · 반경 구간(도보 5분 → 3km 밖)별로 나눠 가까운 순으로 전부 보여준다.
 *  · 티어(필수/돌봄교육/취향) 필터를 제공한다.
 *  · 항목을 누르면 그 시설만 찍은 미니 지도와 설명이 열린다.
 */
export function NearbyInfraSection({
  unitId,
  unitName,
  origin,
  includeEducation,
}: {
  unitId: string;
  /** 지도 마커에 그대로 쓸 주택 이름 */
  unitName: string;
  origin: LatLng;
  includeEducation: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const infra = useMemo(() => detailInfraFor(unitId, { includeEducation }), [unitId, includeEducation]);
  const list = useMemo(
    () => (tierFilter === "all" ? infra.all : infra.all.filter((poi) => poi.tier === tierFilter)),
    [infra.all, tierFilter],
  );

  const byBand = useMemo(() => {
    const map = new Map<RadiusBandKey, NearbyPoi[]>();
    for (const poi of list) {
      const key = bandOf(poi.distance);
      const bucket = map.get(key);
      if (bucket) bucket.push(poi);
      else map.set(key, [poi]);
    }
    return map;
  }, [list]);

  /** 지도에 찍을 핀. 필터를 반영하고, 너무 빽빽해지지 않게 가까운 순으로 제한한다. */
  const mapPois = useMemo(
    () =>
      list.slice(0, MAP_PIN_LIMIT).map((poi) => ({
        id: poi.id,
        coord: poi.coord,
        label: poi.name,
        categoryLabel: infraCategoryLabel(poi),
        tier: poi.tier,
        distance: poi.distance,
      })),
    [list],
  );

  const selected = selectedId ? infra.all.find((poi) => poi.id === selectedId) ?? null : null;

  const tierCounts = useMemo(() => {
    const counts: Record<MapInfraPoi["tier"], number> = { required: 0, education: 0, preference: 0 };
    for (const poi of infra.all) counts[poi.tier] += 1;
    return counts;
  }, [infra.all]);

  if (!infra.hasAny) {
    return <p className="text-sm text-muted">주변 인프라 데이터를 아직 확보하지 못했어요.</p>;
  }

  const FILTERS: { key: TierFilter; label: string; count: number }[] = [
    { key: "all", label: "전체", count: infra.all.length },
    { key: "required", label: TIER_LABEL.required, count: tierCounts.required },
    ...(includeEducation ? [{ key: "education" as const, label: TIER_LABEL.education, count: tierCounts.education }] : []),
    { key: "preference", label: TIER_LABEL.preference, count: tierCounts.preference },
  ];

  return (
    <div className="space-y-4">
      {/* 티어 필터 */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = tierFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setTierFilter(filter.key)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
                active
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-fg hover:border-primary/40 hover:bg-primary-subtle/50",
              )}
            >
              {filter.key !== "all" && <TierPin tier={filter.key} className="h-4 w-4" />}
              {filter.label}
              <span className={cn("text-xs font-bold", active ? "text-white/80" : "text-muted")}>{filter.count}</span>
            </button>
          );
        })}
      </div>

      {/* 주택 위치 + 주변 인프라를 한 지도에 펼친다. 핀을 누르면 지도 안 바텀 카드로 설명이 뜬다. */}
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border">
        <div className="h-[520px] w-full sm:h-[640px]">
          <MapPanel
            markers={[{ id: "home", coord: origin, label: unitName, caption: unitName, tier: "recommend" }]}
            selectedId="home"
            onSelect={() => {}}
            ariaLabel={`${unitName} 위치와 주변 인프라 지도`}
            infra={mapPois}
            onInfraSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
            selectedInfraId={selectedId}
            fullBleed
          />
        </div>

        {/* 지도 안 바텀 카드 — 선택한 인프라 설명 */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-4 sm:bottom-4"
            >
              <PoiDetailCard poi={selected} onClose={() => setSelectedId(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-xs text-muted">
        지도 핀이나 아래 목록을 누르면 해당 시설 설명이 열려요. 거리는 직선거리에 부산 평균 우회계수를 적용한 예상
        이동거리예요.
      </p>

      {/* 반경 구간별 목록 */}
      <div className="space-y-3">
        {RADIUS_BANDS.map((band) => {
          const items = byBand.get(band.key);
          if (!items || items.length === 0) return null;
          return (
            <section key={band.key}>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-navy">
                <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-bold text-primary">
                  {band.label}
                </span>
                <span className="text-xs font-semibold text-muted">{items.length}곳</span>
              </h4>
              {/* 항목이 많아 1열로 두면 한없이 길어진다. 화면 폭에 따라 열을 늘려 전부 보여준다. */}
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((poi) => (
                  <PoiRow
                    key={poi.id}
                    poi={poi}
                    selected={poi.id === selectedId}
                    onSelect={() => setSelectedId((current) => (current === poi.id ? null : poi.id))}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export { REQUIRED_LABEL, EDUCATION_LABEL };
