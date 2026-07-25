"use client";

import { createElement, useMemo, useState } from "react";
import Image from "next/image";
import {
  Baby,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ExternalLink,
  Hospital,
  MapPin,
  School,
  ShoppingCart,
  Store,
  Train,
  Trees,
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
  KINDER: School,
  ELEM: School,
  MIDDLE: School,
  HIGH: School,
};

/** 카테고리에 맞는 lucide 아이콘 엘리먼트. (컴포넌트를 렌더 중에 새로 만들지 않도록 createElement 로 만든다) */
function poiIcon(poi: NearbyPoi, className: string) {
  const icon: LucideIcon =
    poi.tier === "required"
      ? REQUIRED_ICON[poi.category as InfraCategory] ?? Store
      : poi.tier === "education"
        ? EDUCATION_ICON[poi.category as EduCategory] ?? School
        : Store;
  return createElement(icon, { className, "aria-hidden": true });
}

const TIER_LABEL: Record<MapInfraPoi["tier"], string> = {
  required: "필수 인프라",
  education: "돌봄·교육",
  preference: "취향 가게",
};

type TierFilter = "all" | MapInfraPoi["tier"];

/** 반경 구간마다 처음에 보여줄 개수. 나머지는 "더 보기"로 펼친다. */
const BAND_PREVIEW = 12;
/** 지도에 동시에 찍을 인프라 핀 상한 (가까운 순). */
const MAP_PIN_LIMIT = 60;

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
    <div className="overflow-hidden rounded-[var(--radius-card)] border-2 bg-surface" style={{ borderColor: color.border }}>
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
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-ring)]",
          selected ? "bg-primary-subtle/60" : "hover:bg-surface-muted/70",
        )}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color.border}14`, color: color.fg }}
        >
          {poiIcon(poi, "h-4 w-4")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold" style={{ color: color.fg }}>
            {infraCategoryLabel(poi)}
          </span>
          <span className="block truncate text-sm font-semibold text-fg">
            {poi.name}
            {poi.detail && <span className="ml-1 text-xs font-normal text-muted">{poi.detail}</span>}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">{formatDistance(poi.distance)}</span>
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
  origin,
  includeEducation,
}: {
  unitId: string;
  origin: LatLng;
  includeEducation: boolean;
}) {
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 반경 구간별로 펼친 상태. 구간 안 항목이 많아도 처음엔 일부만 보여준다. */
  const [expanded, setExpanded] = useState<Partial<Record<RadiusBandKey, boolean>>>({});

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

      {/* 주택 위치 + 주변 인프라를 한 지도에 펼친다. 핀을 누르면 아래 카드에 설명이 뜬다. */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border">
        <div className="h-[420px] w-full sm:h-[520px]">
          <MapPanel
            markers={[{ id: "home", coord: origin, label: "이 주택", caption: "이 주택", tier: "recommend" }]}
            selectedId="home"
            onSelect={() => {}}
            ariaLabel="주택 위치와 주변 인프라 지도"
            infra={mapPois}
            onInfraSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
            selectedInfraId={selectedId}
            fullBleed
          />
        </div>
      </div>

      {selected && <PoiDetailCard poi={selected} onClose={() => setSelectedId(null)} />}

      <p className="text-xs text-muted">
        지도 핀이나 아래 목록을 누르면 해당 시설 설명이 열려요. 거리는 직선거리에 부산 평균 우회계수를 적용한 예상
        이동거리예요.
      </p>

      {/* 반경 구간별 목록 */}
      <div className="space-y-3">
        {RADIUS_BANDS.map((band) => {
          const items = byBand.get(band.key);
          if (!items || items.length === 0) return null;
          const open = expanded[band.key] ?? false;
          const shown = open ? items : items.slice(0, BAND_PREVIEW);
          const hidden = items.length - shown.length;
          return (
            <section key={band.key}>
              <h4 className="mb-1.5 flex items-center gap-2 text-sm font-bold text-navy">
                <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-bold text-primary">
                  {band.label}
                </span>
                <span className="text-xs font-semibold text-muted">{items.length}곳</span>
              </h4>
              <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-input)] border border-border bg-surface">
                {shown.map((poi) => (
                  <PoiRow
                    key={poi.id}
                    poi={poi}
                    selected={poi.id === selectedId}
                    onSelect={() => setSelectedId((current) => (current === poi.id ? null : poi.id))}
                  />
                ))}
                {(hidden > 0 || open) && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setExpanded((current) => ({ ...current, [band.key]: !open }))}
                      aria-expanded={open}
                      className="flex w-full items-center justify-center gap-1 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-subtle/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-ring)]"
                    >
                      {open ? (
                        <>
                          접기 <ChevronUp className="h-4 w-4" aria-hidden />
                        </>
                      ) : (
                        <>
                          {hidden}곳 더 보기 <ChevronDown className="h-4 w-4" aria-hidden />
                        </>
                      )}
                    </button>
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export { REQUIRED_LABEL, EDUCATION_LABEL };
