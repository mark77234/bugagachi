"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, ListFilter, RotateCcw, Sparkles, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MapExplorerShell, FLOATING_PANEL } from "@/components/map/MapExplorerShell";
import { MapAssistantPanel } from "@/components/map/MapAssistantPanel";
import { NearbyInfraLegend } from "@/components/map/NearbyInfraLegend";
import type { MapInfraPoi, MapMarker, MapViewportBounds, MarkerTier } from "@/components/map/MapView";
import { HousingMapListCard } from "@/components/map/HousingMapListCard";
import { MapResultsSheet } from "@/components/map/MapResultsSheet";
import { Select } from "@/components/ui/select";
import { ELIGIBILITY_TYPE_LABEL, type EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import { ALL_TYPES } from "@/features/eligibility/eligibility.rules";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { usePreferencesStore, buildSurvey, isBudgetComplete } from "@/features/recommendation/preferences.store";
import { recommend, sortRecommendations, type SortKey } from "@/features/recommendation/recommendation.service";
import type { HousingRecommendation } from "@/features/recommendation/recommendation.types";
import { mapInfraFor, infraCategoryLabel } from "@/features/infra/nearby-infra";
import { useHydrated } from "@/lib/use-hydrated";
import { MOCK_HOUSING, bestCondition, housingById, type HousingUnit } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";

const VALID_TYPES = new Set<EligibilityTypeCode>(MOCK_HOUSING.map((unit) => unit.type));
const VALID_GUNGUS = new Set(MOCK_HOUSING.map((unit) => unit.gungu));

function initialType(value: string | null): EligibilityTypeCode | "all" {
  return value && VALID_TYPES.has(value as EligibilityTypeCode) ? (value as EligibilityTypeCode) : "all";
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

/**
 * 전체 주택 지도 + 생활 취향 추천을 하나로 합친 탐색 화면.
 *
 * 마커는 세 가지로 구분한다.
 *   normal    — 전체 재고 (흰색)
 *   recommend — 2단계 취향 추천 결과 (기본 색)
 *   ai        — AI 갈붕이 대화에서 추천한 주택 (보라색)
 *
 * 마커를 선택했을 때만 그 주변 인프라를 지도에 함께 찍는다.
 */
export function UnifiedMapExplorer() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedUnit = housingById(params.get("selected") ?? "");

  const eligHydrated = useHydrated(useEligibilityStore);
  const prefHydrated = useHydrated(usePreferencesStore);
  const savedResults = useEligibilityStore((s) => s.savedResults);
  const pref = usePreferencesStore();

  const [selectedId, setSelectedId] = useState<string | null>(requestedUnit?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [type, setType] = useState<EligibilityTypeCode | "all">(() => initialType(params.get("type")));
  const [gungu, setGungu] = useState(() => initialGungu(params.get("gungu")));
  const [sort, setSort] = useState<SortKey>("recommend");
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [viewport, setViewport] = useState<MapViewportBounds | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [aiIds, setAiIds] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const gungus = useMemo(() => [...new Set(MOCK_HOUSING.map((unit) => unit.gungu))].sort(), []);
  const types = useMemo(() => [...new Set(MOCK_HOUSING.map((unit) => unit.type))], []);

  // ── 2단계 취향 추천 결과 ────────────────────────────────────────────
  const passed = useMemo(
    () => (savedResults ?? []).filter((result) => result.evaluation.status === "PASS"),
    [savedResults],
  );
  const eligibilitySkipped = pref.eligibilitySkipped && passed.length === 0;
  const recommendTypes = eligibilitySkipped ? ALL_TYPES : passed.map((result) => result.type);
  const recommendMode = prefHydrated && eligHydrated && recommendTypes.length > 0 && isBudgetComplete(pref);

  const outcome = useMemo(() => {
    if (!recommendMode) return null;
    return recommend(recommendTypes, buildSurvey(pref));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recommendMode, savedResults, pref.eligibilitySkipped, pref.maxDeposit, pref.maxMonthlyRent,
    pref.gungus, pref.anyRegion, pref.frequent, pref.infraCategories, pref.eduEnabled,
    pref.eduCategories, pref.storeChips, pref.moodTarget, pref.skipped,
  ]);

  /** unitId → { 순위, 대표 근거 } */
  const recByUnit = useMemo(() => {
    const map = new Map<string, { rank: number; reason?: string; rec: HousingRecommendation }>();
    if (outcome?.kind !== "ok") return map;
    const ordered = sortRecommendations(outcome.recommendations, "recommend", pref.frequent[0]?.coord);
    ordered.forEach((rec, index) => {
      map.set(rec.unitId, { rank: index + 1, reason: rec.reasons[0]?.text, rec });
    });
    return map;
  }, [outcome, pref.frequent]);

  const aiIdSet = useMemo(() => new Set(aiIds), [aiIds]);

  const tierOf = useCallback(
    (unitId: string): MarkerTier => {
      if (aiIdSet.has(unitId)) return "ai";
      return recByUnit.has(unitId) ? "recommend" : "normal";
    },
    [aiIdSet, recByUnit],
  );

  // ── 필터 ────────────────────────────────────────────────────────────
  const filteredUnits = useMemo(
    () =>
      MOCK_HOUSING.filter((unit) => {
        if (type !== "all" && unit.type !== type) return false;
        if (gungu !== "all" && unit.gungu !== gungu) return false;
        if (onlyRecommended && tierOf(unit.id) === "normal") return false;
        return true;
      }),
    [gungu, type, onlyRecommended, tierOf],
  );

  const activeId = filteredUnits.some((unit) => unit.id === selectedId) ? selectedId : null;

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
        // 묶인 주택 중 가장 강한 구분을 마커 색으로 쓴다.
        const tier = list.reduce<MarkerTier>((best, unit) => {
          const current = tierOf(unit.id);
          if (current === "ai") return "ai";
          if (current === "recommend" && best === "normal") return "recommend";
          return best;
        }, "normal");
        const rank = list.map((unit) => recByUnit.get(unit.id)?.rank).filter((value): value is number => !!value);
        return {
          id: rep.id,
          coord: rep.coord,
          label: rep.name,
          caption,
          count: list.length,
          tier,
          rank: rank.length ? Math.min(...rank) : undefined,
        };
      }),
    [groups, tierOf, recByUnit],
  );

  const mapSelectedId = activeId ? unitToRep.get(activeId) ?? activeId : null;

  // ── 선택된 주택 주변 인프라 (마커 이벤트 시에만) ─────────────────────
  const infra: MapInfraPoi[] = useMemo(() => {
    if (!activeId) return [];
    return mapInfraFor(activeId, {
      // 1·2단계 설문에서 자녀·돌봄이 필요하다고 답했을 때만 교육 인프라를 함께 띄운다.
      includeEducation: pref.eduEnabled === true,
      preferredChips: pref.storeChips,
      limit: 10,
    }).map((poi) => ({
      id: poi.id,
      coord: poi.coord,
      label: poi.name,
      categoryLabel: infraCategoryLabel(poi),
      tier: poi.tier,
      distance: poi.distance,
    }));
  }, [activeId, pref.eduEnabled, pref.storeChips]);

  // ── 목록 ────────────────────────────────────────────────────────────
  const visibleUnits = viewport ? filteredUnits.filter((unit) => isInside(viewport, unit)) : filteredUnits;
  const groupedUnits = groupKey ? groups.get(groupKey) ?? visibleUnits : visibleUnits;

  const listUnits = useMemo(() => {
    if (!recommendMode) return groupedUnits;
    // 추천 결과가 있으면 추천 → AI → 나머지 순으로, 선택한 정렬 기준을 적용한다.
    const recs = groupedUnits
      .map((unit) => recByUnit.get(unit.id)?.rec)
      .filter((rec): rec is HousingRecommendation => !!rec);
    const orderedIds = sortRecommendations(recs, sort, pref.frequent[0]?.coord).map((rec) => rec.unitId);
    const rank = new Map(orderedIds.map((id, index) => [id, index]));
    return [...groupedUnits].sort((a, b) => {
      const weight = (unit: HousingUnit) => (aiIdSet.has(unit.id) ? 0 : rank.has(unit.id) ? 1 : 2);
      const diff = weight(a) - weight(b);
      if (diff !== 0) return diff;
      return (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity);
    });
  }, [groupedUnits, recommendMode, recByUnit, sort, pref.frequent, aiIdSet]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const unit = housingById(id);
      if (!unit) return;
      const key = coordKey(unit);
      const groupSize = groups.get(key)?.length ?? 1;
      setGroupKey(groupSize > 1 ? key : null);
    },
    [groups],
  );

  const handleAiRecommend = useCallback((ids: string[]) => {
    setAiIds(ids);
    if (ids[0]) setSelectedId(ids[0]);
  }, []);

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
    setGungu("all");
    setOnlyRecommended(false);
  };

  const hasFilters = type !== "all" || gungu !== "all" || onlyRecommended;
  const filterCount = [type !== "all", gungu !== "all", onlyRecommended].filter(Boolean).length;
  const recommendCount = useMemo(
    () => filteredUnits.filter((unit) => tierOf(unit.id) !== "normal").length,
    [filteredUnits, tierOf],
  );

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeId) next.set("selected", activeId);
    if (gungu !== "all") next.set("gungu", gungu);
    if (type !== "all") next.set("type", type);
    const query = next.toString();
    router.replace(query ? `/map?${query}` : "/map", { scroll: false });
  }, [activeId, gungu, router, type]);

  return (
    <MapExplorerShell
      listCount={listUnits.length}
      listRef={listRef}
      mapProps={{
        markers,
        selectedId: mapSelectedId,
        onSelect: handleSelect,
        onViewportChange: handleViewportChange,
        onHoverChange: setHoveredId,
        hoveredId,
        infra,
        ariaLabel: `부산 공공임대주택 ${filteredUnits.length}곳 지도`,
      }}
      assistant={
        <MapAssistantPanel focusedUnitId={activeId} onRecommend={handleAiRecommend} onSelectUnit={handleSelect} />
      }
      overlay={
        activeId && infra.length > 0 ? (
          <NearbyInfraLegend count={infra.length} tiers={[...new Set(infra.map((poi) => poi.tier))]} />
        ) : null
      }
      controls={
        <>
          {recommendMode && (
            <>
              <label className="sr-only" htmlFor="map-sort">
                결과 정렬
              </label>
              <div className={cn(FLOATING_PANEL, "flex h-11 items-center pl-3 pr-1")}>
                <Select
                  id="map-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="h-9 border-0 bg-transparent pl-1 text-sm font-bold shadow-none focus-visible:outline-none"
                >
                  <option value="recommend">추천순</option>
                  <option value="rent">월 임대료순</option>
                  <option value="deposit">보증금순</option>
                  <option value="distance">거리순</option>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => setOnlyRecommended((value) => !value)}
                aria-pressed={onlyRecommended}
                className={cn(
                  FLOATING_PANEL,
                  "flex h-11 items-center gap-1.5 px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
                  onlyRecommended ? "bg-primary text-white" : "text-fg hover:bg-surface",
                )}
              >
                <Star className="h-4 w-4" aria-hidden />
                추천만
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
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
          <span className={cn(FLOATING_PANEL, "flex h-11 items-center gap-2 px-4 text-sm font-semibold text-navy")}>
            <span>
              <span className="text-primary">{filteredUnits.length}</span>곳
            </span>
            {recommendCount > 0 && (
              <span className="flex items-center gap-1 border-l border-border pl-2 text-xs font-bold text-primary">
                <Star className="h-3 w-3" aria-hidden />
                추천 {recommendCount}
              </span>
            )}
            {aiIds.length > 0 && (
              <span className="flex items-center gap-1 border-l border-border pl-2 text-xs font-bold text-[#6d28d9]">
                <Sparkles className="h-3 w-3" aria-hidden />
                AI {aiIds.length}
              </span>
            )}
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
                <div className="grid gap-2.5 sm:grid-cols-2">
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
      sheet={
        <MapResultsSheet
          units={listUnits}
          selectedId={activeId}
          onSelect={handleSelect}
          metaOf={(unitId) => {
            const rec = recByUnit.get(unitId);
            return { tier: tierOf(unitId), rank: rec?.rank, reason: rec?.reason };
          }}
        />
      }
    >
      {!recommendMode && (
        <Link
          href="/eligibility"
          className="block rounded-[var(--radius-card)] border border-primary/25 bg-primary-subtle p-3 text-sm font-semibold text-primary hover:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25"
        >
          자격 확인과 취향 설문을 마치면 내게 맞는 집을 지도에 표시해 드려요 →
        </Link>
      )}
      {listUnits.length > 0 ? (
        listUnits.map((unit) => {
          const rec = recByUnit.get(unit.id);
          return (
            <HousingMapListCard
              key={unit.id}
              unit={unit}
              selected={unit.id === activeId}
              onSelect={() => handleSelect(unit.id)}
              tier={tierOf(unit.id)}
              rank={rec?.rank}
              reason={rec?.reason}
              onHover={(hovering) => setHoveredId(hovering ? unitToRep.get(unit.id) ?? unit.id : null)}
            />
          );
        })
      ) : (
        <p className="p-8 text-center text-sm text-muted">
          이 지도 영역에는 조건과 맞는 주택이 없어요. 지도를 움직여 보세요.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {activeId ? `${housingById(activeId)?.name ?? "주택"} 선택됨, 주변 인프라 ${infra.length}곳 표시` : ""}
      </p>
    </MapExplorerShell>
  );
}
