"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Filter, Map as MapIcon, List, SlidersHorizontal } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { Disclaimer } from "@/components/common/banners";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ToggleChip } from "@/components/ui/chip";
import { MapPanel } from "@/components/map/MapPanel";
import { MapExplorerShell, FLOATING_PANEL } from "@/components/map/MapExplorerShell";
import { MapResultsSheet } from "@/components/map/MapResultsSheet";
import type { MapMarker } from "@/components/map/MapView";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { usePreferencesStore, buildSurvey, isBudgetComplete } from "@/features/recommendation/preferences.store";
import { useHydrated } from "@/lib/use-hydrated";
import { recommend, sortRecommendations, type SortKey } from "@/features/recommendation/recommendation.service";
import { ELIGIBILITY_TYPE_LABEL, type EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import { ALL_TYPES } from "@/features/eligibility/eligibility.rules";
import { MOCK_HOUSING, RENTAL_DATASET_STATS, bestCondition, housingById } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { HousingRecommendation } from "@/features/recommendation/recommendation.types";

function browseRec(unitType: EligibilityTypeCode, id: string): HousingRecommendation {
  return {
    unitId: id,
    score: { final: 0, byAxis: [], normalizedWeights: {} },
    reasons: [],
    eligibilityType: unitType,
    checkLater: [],
  };
}

function RecommendationsInner() {
  const params = useSearchParams();
  const fresh = params.get("fresh") === "1";
  const eligHydrated = useHydrated(useEligibilityStore);
  const prefHydrated = useHydrated(usePreferencesStore);
  const saved = useEligibilityStore((s) => s.savedResults);
  const pref = usePreferencesStore();

  const [analyzing, setAnalyzing] = useState(fresh);
  const [view, setView] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortKey>("recommend");
  const [typeF, setTypeF] = useState<Set<string>>(new Set());
  const [gunguF, setGunguF] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 지도 마커 선택 시 목록에서 해당 카드로 스크롤
  useEffect(() => {
    if (!activeId) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-rec-unit="${activeId}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setAnalyzing(false), 900);
    return () => clearTimeout(t);
  }, [fresh]);

  const passed = useMemo(() => (saved ?? []).filter((r) => r.evaluation.status === "PASS"), [saved]);
  const eligibilitySkipped = pref.eligibilitySkipped && passed.length === 0;
  const recommendTypes = eligibilitySkipped ? ALL_TYPES : passed.map((result) => result.type);
  const recommendMode = recommendTypes.length > 0 && isBudgetComplete(pref);

  const outcome = useMemo(() => {
    if (!recommendMode) return null;
    return recommend(recommendTypes, buildSurvey(pref));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendMode, saved, pref.eligibilitySkipped, pref.maxDeposit, pref.maxMonthlyRent, pref.gungus, pref.anyRegion, pref.frequent, pref.infraCategories, pref.eduEnabled, pref.eduCategories, pref.storeChips, pref.moodTarget, pref.skipped]);

  const baseRecs: HousingRecommendation[] = useMemo(() => {
    if (recommendMode) return outcome?.kind === "ok" ? outcome.recommendations : [];
    return MOCK_HOUSING.map((u) => browseRec(u.type, u.id));
  }, [recommendMode, outcome]);

  const toggle = (set: Set<string>, v: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    apply(next);
  };

  const filtered = useMemo(() => {
    let list = baseRecs.filter((rec) => {
      const u = housingById(rec.unitId)!;
      if (typeF.size && !typeF.has(u.type)) return false;
      if (gunguF.size && !gunguF.has(u.gungu)) return false;
      return true;
    });
    list = sortRecommendations(list, sort, pref.frequent[0]?.coord);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRecs, typeF, gunguF, sort]);

  const availableTypes = useMemo(() => [...new Set(baseRecs.map((r) => housingById(r.unitId)!.type))], [baseRecs]);
  const availableGungus = useMemo(() => [...new Set(baseRecs.map((r) => housingById(r.unitId)!.gungu))], [baseRecs]);

  const markers: MapMarker[] = filtered.map((rec) => {
    const u = housingById(rec.unitId)!;
    const condition = bestCondition(u);
    return {
      id: u.id,
      coord: u.coord,
      label: u.name,
      caption: condition ? `월 ${formatManwon(condition.monthlyRent)}` : "가격 미공개",
    };
  });
  const resetFilters = () => {
    setTypeF(new Set());
    setGunguF(new Set());
  };

  if (!eligHydrated || !prefHydrated) {
    return (
      <PageContainer className="py-10">
        <LoadingState />
      </PageContainer>
    );
  }

  if (analyzing) {
    return (
      <PageContainer className="py-16">
        <LoadingState title="추천을 분석하고 있어요" description="예산·지역으로 후보를 좁히고 생활 취향 점수를 계산하는 중이에요." />
      </PageContainer>
    );
  }

  // 하드필터 0개
  if (recommendMode && outcome?.kind === "empty") {
    const isBudget = outcome.reason === "budget";
    return (
      <PageContainer size="narrow" className="py-12">
        <EmptyState
          title={isBudget ? "예산에 맞는 주택이 없어요" : "선택한 지역에 맞는 주택이 없어요"}
          description={
            isBudget
              ? `예산을 조금 넓히면 약 ${outcome.nearMissCount}곳을 더 볼 수 있어요.`
              : `지역 조건을 넓히면 약 ${outcome.nearMissCount}곳을 볼 수 있어요.`
          }
          action={
            <Link href="/preferences" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>
              {isBudget ? "예산 다시 설정" : "지역 다시 설정"}
            </Link>
          }
        />
        <Disclaimer className="mt-8" />
      </PageContainer>
    );
  }

  return (
    <MapExplorerShell
      current="recommendations"
      listCount={filtered.length}
      listRef={listRef}
      mapProps={{
        markers,
        selectedId: activeId,
        onSelect: setActiveId,
        ariaLabel: `추천 주택 ${filtered.length}곳 갈붕 지도`,
      }}
      controls={
        <>
          <label className="sr-only" htmlFor="sort">
            결과 정렬
          </label>
          <div className={cn(FLOATING_PANEL, "flex h-11 items-center pl-3 pr-1")}>
            <Select
              id="sort"
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
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
            aria-controls="rec-filters"
            className={cn(
              FLOATING_PANEL,
              "flex h-11 items-center gap-1.5 px-4 text-sm font-bold transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
              typeF.size || gunguF.size ? "text-primary" : "text-fg",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            조건
            {typeF.size + gunguF.size > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
                {typeF.size + gunguF.size}
              </span>
            )}
          </button>
          <span className={cn(FLOATING_PANEL, "flex h-11 items-center px-4 text-sm font-semibold text-navy")}>
            <span className="text-primary">{filtered.length}</span>곳 {recommendMode ? "추천" : ""}
          </span>

          <AnimatePresence>
            {showFilters && (
              <motion.section
                id="rec-filters"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="w-[min(92vw,460px)] basis-full rounded-[var(--radius-cardlg)] border border-border bg-surface/97 p-3 shadow-[var(--shadow-sheet)] backdrop-blur"
                aria-label="추천 결과 필터"
              >
                <div className="space-y-3">
                  <FilterRow label="임대 유형">
                    {availableTypes.map((t) => (
                      <ToggleChip
                        key={t}
                        label={ELIGIBILITY_TYPE_LABEL[t]}
                        selected={typeF.has(t)}
                        onToggle={() => toggle(typeF, t, setTypeF)}
                      />
                    ))}
                  </FilterRow>
                  <FilterRow label="구·군">
                    {availableGungus.map((item) => (
                      <ToggleChip
                        key={item}
                        label={item}
                        selected={gunguF.has(item)}
                        onToggle={() => toggle(gunguF, item, setGunguF)}
                      />
                    ))}
                  </FilterRow>
                  {(typeF.size > 0 || gunguF.size > 0) && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      초기화
                    </Button>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </>
      }
      listTitle={
        <span className="min-w-0 text-sm font-bold text-navy">
          {recommendMode ? "맞춤 추천" : "전체 주택"} <span className="text-primary">{filtered.length}곳</span>
          {recommendMode && (
            <span className="ml-1.5 text-xs font-medium text-muted">
              {eligibilitySkipped ? "자격 미반영" : `${passed.length}개 유형`}
            </span>
          )}
        </span>
      }
      sheet={
        <MapResultsSheet
          units={filtered.map((rec) => housingById(rec.unitId)!).filter(Boolean)}
          selectedId={activeId}
          onSelect={setActiveId}
        />
      }
    >
      {!recommendMode && (
        <Link
          href="/eligibility"
          className="block rounded-[var(--radius-card)] border border-primary/25 bg-primary-subtle p-3 text-sm font-semibold text-primary hover:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25"
        >
          자격 확인과 취향 설문을 완료해 맞춤 순서로 보기 →
        </Link>
      )}
      {filtered.length > 0 ? (
        filtered.map((rec) => (
          <RecommendationCard
            key={rec.unitId}
            rec={rec}
            unit={housingById(rec.unitId)!}
            active={activeId === rec.unitId}
            onActivate={() => setActiveId(rec.unitId)}
          />
        ))
      ) : (
        <div className="p-6">
          <EmptyState
            title="조건에 맞는 주택이 없어요"
            description="적용한 필터를 초기화하면 전체 결과를 다시 볼 수 있어요."
            action={
              <Button variant="primary" size="md" onClick={resetFilters}>
                필터 초기화
              </Button>
            }
          />
        </div>
      )}
      <Disclaimer className="mt-4" />
    </MapExplorerShell>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Filter className="h-3.5 w-3.5 text-muted" aria-hidden /> {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-10">
          <LoadingState />
        </PageContainer>
      }
    >
      <RecommendationsInner />
    </Suspense>
  );
}
