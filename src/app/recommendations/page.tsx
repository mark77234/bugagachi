"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Filter, Map as MapIcon, List, SlidersHorizontal } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Disclaimer, InformationBanner } from "@/components/common/banners";
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
import { MOCK_HOUSING, bestCondition, housingById } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { HousingRecommendation } from "@/features/recommendation/recommendation.types";

const STATUS_OPTS = [
  { value: "open", label: "모집 중" },
  { value: "upcoming", label: "모집 예정" },
  { value: "closed", label: "마감" },
] as const;

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
  const [statusF, setStatusF] = useState<Set<string>>(new Set());
  const [gunguF, setGunguF] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setAnalyzing(false), 900);
    return () => clearTimeout(t);
  }, [fresh]);

  const passed = useMemo(() => (saved ?? []).filter((r) => r.evaluation.status === "PASS"), [saved]);
  const recommendMode = passed.length > 0 && isBudgetComplete(pref);

  const outcome = useMemo(() => {
    if (!recommendMode) return null;
    return recommend(passed.map((r) => r.type), buildSurvey(pref));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendMode, saved, pref.maxDeposit, pref.maxMonthlyRent, pref.gungus, pref.anyRegion, pref.frequent, pref.infraCategories, pref.eduEnabled, pref.eduCategories, pref.storeChips, pref.storeCustom, pref.mood, pref.skipped]);

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
      if (statusF.size && !statusF.has(u.recruitStatus)) return false;
      if (gunguF.size && !gunguF.has(u.gungu)) return false;
      return true;
    });
    list = sortRecommendations(list, sort, pref.frequent[0]?.coord);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRecs, typeF, statusF, gunguF, sort]);

  const availableTypes = useMemo(() => [...new Set(baseRecs.map((r) => housingById(r.unitId)!.type))], [baseRecs]);
  const availableGungus = useMemo(() => [...new Set(baseRecs.map((r) => housingById(r.unitId)!.gungu))], [baseRecs]);

  const markers: MapMarker[] = filtered.map((rec) => {
    const u = housingById(rec.unitId)!;
    return { id: u.id, coord: u.coord, label: u.name, caption: `월 ${formatManwon(bestCondition(u).monthlyRent)}` };
  });

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
    <PageContainer size="wide" className="py-8">
      <SectionHeader
        as="h1"
        eyebrow={recommendMode ? "맞춤 추천" : "전체 모집공고"}
        title={recommendMode ? "추천 주택" : "부산 공공임대 공고"}
        description={
          recommendMode
            ? "자격을 통과한 주택을 예산·지역·생활 취향으로 정렬했어요. 점수 대신 근거로 설명해요."
            : "자격 확인과 취향 설문을 완료하면 나에게 맞는 순서로 추천해 드려요."
        }
      />

      {!recommendMode && (
        <InformationBanner tone="primary" className="mb-6" title="맞춤 추천을 받아보세요">
          <Link href="/eligibility" className="font-semibold text-primary underline">
            1단계 자격 확인
          </Link>
          과 2단계 취향 설문을 완료하면 예산·생활권에 맞춰 순서를 매겨드려요.
        </InformationBanner>
      )}

      {recommendMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-input)] bg-surface-muted/70 p-3 text-sm">
          <span className="font-semibold text-navy">선택한 조건</span>
          {passed.map((r) => (
            <Badge key={r.type} tone="success">
              {ELIGIBILITY_TYPE_LABEL[r.type]}
            </Badge>
          ))}
          <span className="text-muted">
            · 예산 보증금 {formatManwon(pref.maxDeposit ?? 0)} / 월 {formatManwon(pref.maxMonthlyRent ?? 0)} 이하
          </span>
          <span className="text-muted">· 지역 {pref.anyRegion || pref.gungus.length === 0 ? "전체" : pref.gungus.join(", ")}</span>
        </div>
      )}

      {/* 툴바 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <SlidersHorizontal className="h-4 w-4" /> 필터
          </Button>
          <span className="text-sm text-muted">{filtered.length}곳</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="sort">
            정렬
          </label>
          <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="recommend">추천순</option>
            <option value="rent">월 임대료순</option>
            <option value="deposit">보증금순</option>
            <option value="distance">거리순</option>
          </Select>
          {/* 모바일 목록/지도 토글 */}
          <div className="flex rounded-[var(--radius-input)] border border-border lg:hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn("flex h-11 items-center gap-1 px-3 text-sm", view === "list" ? "bg-primary-subtle text-primary" : "text-muted")}
              aria-pressed={view === "list"}
            >
              <List className="h-4 w-4" /> 목록
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={cn("flex h-11 items-center gap-1 px-3 text-sm", view === "map" ? "bg-primary-subtle text-primary" : "text-muted")}
              aria-pressed={view === "map"}
            >
              <MapIcon className="h-4 w-4" /> 지도
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="mb-5 space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <FilterRow label="임대 유형">
            {availableTypes.map((t) => (
              <ToggleChip key={t} label={ELIGIBILITY_TYPE_LABEL[t]} selected={typeF.has(t)} onToggle={() => toggle(typeF, t, setTypeF)} />
            ))}
          </FilterRow>
          <FilterRow label="모집 상태">
            {STATUS_OPTS.map((s) => (
              <ToggleChip key={s.value} label={s.label} selected={statusF.has(s.value)} onToggle={() => toggle(statusF, s.value, setStatusF)} />
            ))}
          </FilterRow>
          <FilterRow label="구·군">
            {availableGungus.map((g) => (
              <ToggleChip key={g} label={g} selected={gunguF.has(g)} onToggle={() => toggle(gunguF, g, setGunguF)} />
            ))}
          </FilterRow>
        </div>
      )}

      {/* 본문: 리스트 + 지도 */}
      {filtered.length === 0 ? (
        <EmptyState title="조건에 맞는 주택이 없어요" description="필터를 조정해 보세요." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(420px,55%)]">
          <div className={cn("space-y-3", view === "map" && "hidden lg:block")}>
            {filtered.map((rec) => (
              <RecommendationCard
                key={rec.unitId}
                rec={rec}
                unit={housingById(rec.unitId)!}
                active={activeId === rec.unitId}
                onActivate={() => setActiveId(rec.unitId)}
              />
            ))}
          </div>
          <div className={cn("h-[68vh] lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]", view === "list" && "hidden lg:block")}>
            <MapPanel markers={markers} selectedId={activeId} onSelect={setActiveId} />
          </div>
        </div>
      )}

      <Disclaimer className="mt-10" />
    </PageContainer>
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
