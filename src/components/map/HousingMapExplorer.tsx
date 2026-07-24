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
import { ELIGIBILITY_TYPE_LABEL, type EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import { MOCK_HOUSING, bestCondition, housingById, type RecruitStatus } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<RecruitStatus, string> = {
  open: "모집 중",
  upcoming: "모집 예정",
  closed: "마감",
};
const VALID_STATUSES = new Set<RecruitStatus>(["open", "upcoming", "closed"]);
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
  const markers: MapMarker[] = filteredUnits.map((unit) => ({
    id: unit.id,
    coord: unit.coord,
    label: unit.name,
    caption: `월 ${formatManwon(bestCondition(unit).monthlyRent)}`,
  }));

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
    <div>
      <section
        aria-labelledby="map-filter-title"
        className="sticky top-16 z-20 mb-4 rounded-[var(--radius-card)] border border-border bg-surface/95 p-3 shadow-[var(--shadow-sm)] backdrop-blur"
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
              {(Object.entries(STATUS_LABEL) as [RecruitStatus, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-semibold text-navy">
          필터 결과 <span className="text-primary">{filteredUnits.length}곳</span>
        </p>
        <p className="text-muted" aria-live="polite">
          현재 지도 영역 {visibleUnits.length}곳
        </p>
      </div>

      <div className="relative grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside
          className="hidden max-h-[calc(100dvh-9rem)] space-y-3 overflow-y-auto pr-1 lg:block"
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

        <div className="relative h-[calc(100dvh-13rem)] min-h-[500px] lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]">
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
