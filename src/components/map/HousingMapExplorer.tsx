"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Filter, RotateCcw } from "lucide-react";
import { MapPanel } from "@/components/map/MapPanel";
import type { MapMarker, MapViewportBounds } from "@/components/map/MapView";
import { HousingMapListCard } from "@/components/map/HousingMapListCard";
import { MapResultsSheet } from "@/components/map/MapResultsSheet";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ELIGIBILITY_TYPE_LABEL, type EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import { MOCK_HOUSING, RENTAL_DATASET_STATS, bestCondition, housingById, type RecruitStatus } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<RecruitStatus, string> = {
  open: "모집 중",
  upcoming: "모집 예정",
  closed: "마감",
  unknown: "공고 확인 필요",
};
const VALID_STATUSES = new Set<RecruitStatus>(["open", "upcoming", "closed", "unknown"]);
const VALID_TYPES = new Set<EligibilityTypeCode>(MOCK_HOUSING.map((unit) => unit.type));
const VALID_GUNGUS = new Set(MOCK_HOUSING.map((unit) => unit.gungu));

function initialType(value: string | null): EligibilityTypeCode | "all" {
  return value && VALID_TYPES.has(value as EligibilityTypeCode) ? (value as EligibilityTypeCode) : "all";
}

function initialStatus(value: string | null): RecruitStatus | "all" {
  return value && VALID_STATUSES.has(value as RecruitStatus) ? (value as RecruitStatus) : "all";
}

function initialGungu(value: string | null): string {
  return value && VALID_GUNGUS.has(value) ? value : "all";
}

function isInside(bounds: MapViewportBounds, unit: (typeof MOCK_HOUSING)[number]) {
  return (
    unit.coord.lat <= bounds.north &&
    unit.coord.lat >= bounds.south &&
    unit.coord.lng <= bounds.east &&
    unit.coord.lng >= bounds.west
  );
}

function sameBounds(current: MapViewportBounds | null, next: MapViewportBounds) {
  if (!current) return false;
  const threshold = 0.000001;
  return (
    Math.abs(current.north - next.north) < threshold &&
    Math.abs(current.south - next.south) < threshold &&
    Math.abs(current.east - next.east) < threshold &&
    Math.abs(current.west - next.west) < threshold
  );
}

export function HousingMapExplorer() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedUnit = housingById(params.get("selected") ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(requestedUnit?.id ?? null);
  const [type, setType] = useState<EligibilityTypeCode | "all">(() => initialType(params.get("type")));
  const [status, setStatus] = useState<RecruitStatus | "all">(() => initialStatus(params.get("status")));
  const [gungu, setGungu] = useState(() => initialGungu(params.get("gungu")));
  const [viewport, setViewport] = useState<MapViewportBounds | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const gungus = useMemo(() => [...new Set(MOCK_HOUSING.map((unit) => unit.gungu))].sort(), []);
  const types = useMemo(() => [...new Set(MOCK_HOUSING.map((unit) => unit.type))], []);
  const statuses = useMemo(() => [...new Set(MOCK_HOUSING.map((unit) => unit.recruitStatus))], []);

  const filteredUnits = useMemo(
    () =>
      MOCK_HOUSING.filter((unit) => {
        if (type !== "all" && unit.type !== type) return false;
        if (status !== "all" && unit.recruitStatus !== status) return false;
        if (gungu !== "all" && unit.gungu !== gungu) return false;
        return true;
      }),
    [gungu, status, type],
  );

  const activeId = filteredUnits.some((unit) => unit.id === selectedId) ? selectedId : null;
  const visibleUnits = viewport ? filteredUnits.filter((unit) => isInside(viewport, unit)) : filteredUnits;
  const markers: MapMarker[] = filteredUnits.map((unit) => {
    const condition = bestCondition(unit);
    return {
      id: unit.id,
      coord: unit.coord,
      label: unit.name,
      caption: condition ? `월 ${formatManwon(condition.monthlyRent)}` : "가격 미공개",
    };
  });

  const handleViewportChange = useCallback((next: MapViewportBounds) => {
    setViewport((current) => (sameBounds(current, next) ? current : next));
  }, []);

  const resetFilters = () => {
    setType("all");
    setStatus("all");
    setGungu("all");
  };

  const hasFilters = type !== "all" || status !== "all" || gungu !== "all";

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeId) next.set("selected", activeId);
    if (gungu !== "all") next.set("gungu", gungu);
    if (type !== "all") next.set("type", type);
    if (status !== "all") next.set("status", status);
    const query = next.toString();
    router.replace(query ? `/map?${query}` : "/map", { scroll: false });
  }, [activeId, gungu, router, status, type]);

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col md:h-dvh md:min-h-0">
      <header className="shrink-0 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-[-0.02em] text-navy sm:text-2xl">전체 주택 지도</h1>
              <Badge tone="primary">{RENTAL_DATASET_STATS.buildings}개 건물</Badge>
            </div>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              JSON 원본 {RENTAL_DATASET_STATS.validRows}호실을 건물 단위로 탐색해요. 모집 일정은 공식 공고 확인이 필요합니다.
            </p>
          </div>
          <p className="rounded-full bg-warning-subtle px-3 py-1.5 text-xs font-semibold text-warning">
            재고 데이터 · 실시간 공고 아님
          </p>
        </div>
      </header>

      <section
        aria-labelledby="map-filter-title"
        className="z-20 shrink-0 border-b border-border bg-surface/95 px-4 py-3 shadow-[var(--shadow-sm)] backdrop-blur sm:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 sm:mb-2">
          <h2 id="map-filter-title" className="flex items-center gap-2 text-base font-bold">
            <Filter className="h-4 w-4 text-primary" aria-hidden />
            주택 필터
          </h2>
          <div className="flex items-center gap-1">
            {hasFilters && (
              <button type="button" onClick={resetFilters} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                초기화
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMobileFilters((value) => !value)}
              aria-expanded={showMobileFilters}
              aria-controls="map-filter-options"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "sm:hidden")}
            >
              {showMobileFilters ? "접기" : "펼치기"}
              {showMobileFilters ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
        <div id="map-filter-options" className={cn("gap-3 sm:grid sm:grid-cols-3", showMobileFilters ? "grid" : "hidden")}>
          <label className="grid gap-1.5 text-sm font-semibold text-fg">
            지역
            <Select value={gungu} onChange={(event) => setGungu(event.target.value)} className="w-full">
              <option value="all">부산 전체</option>
              {gungus.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-fg">
            임대 유형
            <Select
              value={type}
              onChange={(event) => setType(event.target.value as EligibilityTypeCode | "all")}
              className="w-full"
            >
              <option value="all">전체 유형</option>
              {types.map((item) => (
                <option key={item} value={item}>
                  {ELIGIBILITY_TYPE_LABEL[item]}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-fg">
            모집 상태
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as RecruitStatus | "all")}
              className="w-full"
            >
              <option value="all">전체 상태</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </section>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-bg px-4 py-2 text-sm sm:px-6">
        <p className="font-semibold text-navy">
          필터 결과 <span className="text-primary">{filteredUnits.length}곳</span>
        </p>
        <p className="text-muted" aria-live="polite">
          현재 지도 영역 {visibleUnits.length}곳
        </p>
      </div>

      <div className="relative grid min-h-0 flex-1 lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside
          className="hidden min-h-0 space-y-3 overflow-y-auto border-r border-border bg-surface p-4 lg:block"
          aria-label="현재 지도 영역의 주택 목록"
        >
          {visibleUnits.length > 0 ? (
            visibleUnits.map((unit) => (
              <HousingMapListCard
                key={unit.id}
                unit={unit}
                selected={unit.id === activeId}
                onSelect={() => setSelectedId(unit.id)}
              />
            ))
          ) : (
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center text-sm text-muted">
              현재 지도 영역에 조건과 맞는 주택이 없어요.
            </div>
          )}
        </aside>

        <div className="relative min-h-[560px] lg:min-h-0">
          <MapPanel
            markers={markers}
            selectedId={activeId}
            onSelect={setSelectedId}
            onViewportChange={handleViewportChange}
            ariaLabel={`부산 공공임대주택 ${filteredUnits.length}곳 지도`}
          />
          <MapResultsSheet units={visibleUnits} selectedId={activeId} onSelect={setSelectedId} />
          <p className="sr-only" aria-live="polite">
            {activeId ? `${housingById(activeId)?.name ?? "주택"} 선택됨` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
