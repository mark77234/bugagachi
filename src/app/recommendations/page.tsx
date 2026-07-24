"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-bg md:h-dvh md:min-h-0 md:overflow-hidden">
      <header className="shrink-0 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] text-navy sm:text-2xl">
                {recommendMode ? "맞춤 추천" : "지도에서 찾기"}
              </h1>
              <Badge tone={recommendMode ? "success" : "primary"}>
                {recommendMode ? `${filtered.length}곳 추천` : `${RENTAL_DATASET_STATS.buildings}개 건물`}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              {recommendMode
                ? "예산과 생활 취향을 반영한 순서예요. 최종 자격은 공식 공고에서 확인하세요."
                : `제공된 JSON ${RENTAL_DATASET_STATS.validRows}호실을 건물 단위로 묶어 탐색해요.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="sort">
              결과 정렬
            </label>
            <Select id="sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="min-w-32">
              <option value="recommend">추천순</option>
              <option value="rent">월 임대료순</option>
              <option value="deposit">보증금순</option>
              <option value="distance">거리순</option>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              조건
            </Button>
          </div>
        </div>

        {recommendMode && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {eligibilitySkipped ? (
              <Badge tone="warning">자격 미반영</Badge>
            ) : (
              passed.map((result) => (
                <Badge key={result.type} tone="success">
                  {ELIGIBILITY_TYPE_LABEL[result.type]}
                </Badge>
              ))
            )}
            <span className="text-muted">
              보증금 {formatManwon(pref.maxDeposit ?? 0)} · 월 {formatManwon(pref.maxMonthlyRent ?? 0)} 이하
            </span>
            <span className="text-muted">· {pref.anyRegion || pref.gungus.length === 0 ? "지역 전체" : pref.gungus.join(", ")}</span>
          </div>
        )}

        <div className="mt-3 flex rounded-[var(--radius-input)] border border-border md:hidden">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-l-[var(--radius-input)] text-sm font-semibold",
              view === "list" ? "bg-primary text-white" : "bg-surface text-muted",
            )}
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" aria-hidden /> 목록
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-r-[var(--radius-input)] text-sm font-semibold",
              view === "map" ? "bg-primary text-white" : "bg-surface text-muted",
            )}
            aria-pressed={view === "map"}
          >
            <MapIcon className="h-4 w-4" aria-hidden /> 지도
          </button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.section
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="z-10 shrink-0 border-b border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] sm:px-6"
            aria-label="추천 결과 필터"
          >
            <div className="flex flex-wrap items-end gap-4">
              <FilterRow label="임대 유형">
                {availableTypes.map((type) => (
                  <ToggleChip
                    key={type}
                    label={ELIGIBILITY_TYPE_LABEL[type]}
                    selected={typeF.has(type)}
                    onToggle={() => toggle(typeF, type, setTypeF)}
                  />
                ))}
              </FilterRow>
              <FilterRow label="구·군">
                {availableGungus.map((item) => (
                  <ToggleChip key={item} label={item} selected={gunguF.has(item)} onToggle={() => toggle(gunguF, item, setGunguF)} />
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

      {filtered.length === 0 ? (
        <div className="grid flex-1 place-items-center p-6">
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
      ) : (
        <div className="grid min-h-0 flex-1 md:grid-cols-[430px_minmax(0,1fr)]">
          <section
            className={cn(
              "min-h-0 border-r border-border bg-surface md:block md:overflow-y-auto",
              view === "map" && "hidden",
            )}
            aria-label="추천 주택 목록"
          >
            <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
              <p className="text-sm font-bold text-navy">추천 결과 {filtered.length}곳</p>
              <Link href="/map" className="text-sm font-semibold text-primary hover:underline">
                전체 지도 보기
              </Link>
            </div>
            <div className="space-y-3 p-4">
              {!recommendMode && (
                <Link
                  href="/eligibility"
                  className="block rounded-[var(--radius-card)] border border-primary/25 bg-primary-subtle p-4 text-sm font-semibold text-primary hover:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25"
                >
                  자격 확인과 취향 설문을 완료해 맞춤 순서로 보기 →
                </Link>
              )}
              {filtered.map((rec) => (
                <RecommendationCard
                  key={rec.unitId}
                  rec={rec}
                  unit={housingById(rec.unitId)!}
                  active={activeId === rec.unitId}
                  onActivate={() => setActiveId(rec.unitId)}
                />
              ))}
              <Disclaimer className="mt-6" />
            </div>
          </section>
          <section className={cn("relative min-h-[560px] md:block md:min-h-0", view === "list" && "hidden")} aria-label="추천 주택 지도">
            <MapPanel markers={markers} selectedId={activeId} onSelect={setActiveId} ariaLabel={`추천 주택 ${filtered.length}곳 지도`} />
            <div className="pointer-events-none absolute left-4 top-4 hidden max-w-xs rounded-[var(--radius-card)] border border-border bg-surface/95 p-3 text-xs text-muted shadow-[var(--shadow-md)] backdrop-blur lg:block">
              JSON 원본 좌표를 사용합니다. 모집 상태와 일정은 제공되지 않아 공식 공고 확인이 필요합니다.
            </div>
          </section>
        </div>
      )}
    </div>
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
