"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Layers, ListFilter, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MapExplorerShell, FLOATING_PANEL } from "@/components/map/MapExplorerShell";
import type { MapMarker, MapViewportBounds } from "@/components/map/MapView";
import { HousingMapListCard } from "@/components/map/HousingMapListCard";
import { MapResultsSheet } from "@/components/map/MapResultsSheet";
import { Select } from "@/components/ui/select";
import { ELIGIBILITY_TYPE_LABEL, type EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import { MOCK_HOUSING, bestCondition, housingById, type HousingUnit, type RecruitStatus } from "@/mocks/housing";
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

/** 같은 위치(건물/상가)를 하나의 마커로 묶기 위한 좌표 키. */
function coordKey(unit: HousingUnit) {
  return `${unit.coord.lat.toFixed(5)},${unit.coord.lng.toFixed(5)}`;
}

function isInside(bounds: MapViewportBounds, unit: HousingUnit) {
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
  const [showFilters, setShowFilters] = useState(false);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

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

  // 같은 위치(건물/상가)로 묶기
  const groups = useMemo(() => {
    const map = new Map<string, HousingUnit[]>();
    for (const unit of filteredUnits) {
      const key = coordKey(unit);
      const list = map.get(key);
      if (list) list.push(unit);
      else map.set(key, [unit]);
    }
    return map;
  }, [filteredUnits]);

  const unitToRep = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of groups.values()) {
      const rep = list[0].id;
      for (const unit of list) map.set(unit.id, rep);
    }
    return map;
  }, [groups]);

  const markers: MapMarker[] = useMemo(
    () =>
      [...groups.values()].map((list) => {
        const rep = list[0];
        const rents = list
          .map((unit) => bestCondition(unit)?.monthlyRent)
          .filter((value): value is number => value != null);
        const minRent = rents.length ? Math.min(...rents) : null;
        const caption = minRent == null ? "가격 미공개" : `월 ${formatManwon(minRent)}${list.length > 1 ? "~" : ""}`;
        return { id: rep.id, coord: rep.coord, label: rep.name, caption, count: list.length };
      }),
    [groups],
  );

  const mapSelectedId = activeId ? unitToRep.get(activeId) ?? activeId : null;

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const unit = housingById(id);
      if (!unit) return;
      const key = coordKey(unit);
      const groupSize = groups.get(key)?.length ?? 1;
      setGroupKey(groupSize > 1 ? key : null);
      setListOpen(true);
    },
    [groups],
  );

  const listUnits = groupKey ? groups.get(groupKey) ?? visibleUnits : visibleUnits;

  // 마커 선택 시 목록에서 해당 카드로 스크롤
  useEffect(() => {
    if (!activeId) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-map-unit="${activeId}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId, groupKey]);

  const handleViewportChange = useCallback((next: MapViewportBounds) => {
    setViewport((current) => (sameBounds(current, next) ? current : next));
  }, []);

  const resetFilters = () => {
    setType("all");
    setStatus("all");
    setGungu("all");
  };

  const hasFilters = type !== "all" || status !== "all" || gungu !== "all";
  const filterCount = [type !== "all", status !== "all", gungu !== "all"].filter(Boolean).length;

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
    <MapExplorerShell
      current="map"
      listCount={listUnits.length}
      listRef={listRef}
      mapProps={{
        markers,
        selectedId: mapSelectedId,
        onSelect: handleSelect,
        onViewportChange: handleViewportChange,
        ariaLabel: `부산 공공임대주택 ${filteredUnits.length}곳 지도`,
      }}
      controls={
        <>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="map-filters"
            className={cn(
              FLOATING_PANEL,
              "flex h-11 items-center gap-1.5 px-4 text-sm font-bold transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
              hasFilters ? "text-primary" : "text-fg",
            )}
          >
            <ListFilter className="h-4 w-4" aria-hidden />
            필터
            {filterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
                {filterCount}
              </span>
            )}
          </button>
          <span className={cn(FLOATING_PANEL, "flex h-11 items-center px-4 text-sm font-semibold text-navy")}>
            <span className="text-primary">{filteredUnits.length}</span>곳
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className={cn(
                FLOATING_PANEL,
                "flex h-11 items-center gap-1.5 px-4 text-sm font-semibold text-muted transition-colors hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
              )}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              초기화
            </button>
          )}

          <AnimatePresence>
            {showFilters && (
              <motion.div
                id="map-filters"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="w-[min(92vw,420px)] basis-full rounded-[var(--radius-cardlg)] border border-border bg-surface/97 p-3 shadow-[var(--shadow-sheet)] backdrop-blur"
              >
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <label className="grid gap-1 text-xs font-bold text-muted">
                    지역
                    <Select value={gungu} onChange={(e) => setGungu(e.target.value)} className="h-11 w-full">
                      <option value="all">부산 전체</option>
                      {gungus.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-muted">
                    임대 유형
                    <Select
                      value={type}
                      onChange={(e) => setType(e.target.value as EligibilityTypeCode | "all")}
                      className="h-11 w-full"
                    >
                      <option value="all">전체 유형</option>
                      {types.map((item) => (
                        <option key={item} value={item}>
                          {ELIGIBILITY_TYPE_LABEL[item]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-muted">
                    모집 상태
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as RecruitStatus | "all")}
                      className="h-11 w-full"
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
              </motion.div>
            )}
          </AnimatePresence>
        </>
      }
      listTitle={
        groupKey && listUnits.length > 1 ? (
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Layers className="h-4 w-4" aria-hidden />
              이 위치 {listUnits.length}곳
            </span>
            <button
              type="button"
              onClick={() => setGroupKey(null)}
              className="inline-flex items-center gap-1 rounded text-sm font-semibold text-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> 전체
            </button>
          </span>
        ) : (
          <span className="text-sm font-bold text-navy">
            지도 영역 <span className="text-primary">{listUnits.length}곳</span>
          </span>
        )
      }
      sheet={<MapResultsSheet units={listUnits} selectedId={activeId} onSelect={handleSelect} />}
    >
      {listUnits.length > 0 ? (
        listUnits.map((unit) => (
          <HousingMapListCard
            key={unit.id}
            unit={unit}
            selected={unit.id === activeId}
            onSelect={() => handleSelect(unit.id)}
          />
        ))
      ) : (
        <p className="p-8 text-center text-sm text-muted">
          이 지도 영역에는 조건과 맞는 주택이 없어요. 지도를 움직여 보세요.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {activeId ? `${housingById(activeId)?.name ?? "주택"} 선택됨` : ""}
      </p>
    </MapExplorerShell>
  );
}
