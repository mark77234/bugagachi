"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/common/PageContainer";
import { Disclaimer } from "@/components/common/banners";
import { EmptyState, LoadingState } from "@/components/common/states";
import { buttonVariants } from "@/components/ui/button";
import { UnifiedMapExplorer } from "@/components/map/UnifiedMapExplorer";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { usePreferencesStore, buildSurvey, isBudgetComplete } from "@/features/recommendation/preferences.store";
import { useHydrated } from "@/lib/use-hydrated";
import { recommend } from "@/features/recommendation/recommendation.service";
import { ALL_TYPES } from "@/features/eligibility/eligibility.rules";
import { cn } from "@/lib/utils";

/**
 * 맞춤 추천 결과.
 * 전체 재고 지도와 추천이 한 화면으로 합쳐져서, 이 라우트는 진입 상태(분석 중·하드필터 0건)만
 * 처리하고 실제 탐색은 지도 화면과 동일한 UnifiedMapExplorer 가 담당한다.
 */
function RecommendationsInner() {
  const params = useSearchParams();
  const fresh = params.get("fresh") === "1";
  const eligHydrated = useHydrated(useEligibilityStore);
  const prefHydrated = useHydrated(usePreferencesStore);
  const saved = useEligibilityStore((s) => s.savedResults);
  const pref = usePreferencesStore();

  const [analyzing, setAnalyzing] = useState(fresh);

  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => setAnalyzing(false), 900);
    return () => clearTimeout(timer);
  }, [fresh]);

  const passed = useMemo(() => (saved ?? []).filter((r) => r.evaluation.status === "PASS"), [saved]);
  const eligibilitySkipped = pref.eligibilitySkipped && passed.length === 0;
  const recommendTypes = eligibilitySkipped ? ALL_TYPES : passed.map((result) => result.type);
  const recommendMode = recommendTypes.length > 0 && isBudgetComplete(pref);

  const outcome = useMemo(() => {
    if (!recommendMode) return null;
    return recommend(recommendTypes, buildSurvey(pref));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recommendMode, saved, pref.eligibilitySkipped, pref.maxDeposit, pref.maxMonthlyRent,
    pref.gungus, pref.anyRegion, pref.frequent, pref.infraCategories, pref.eduEnabled,
    pref.eduCategories, pref.storeChips, pref.moodTarget, pref.skipped,
  ]);

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
        <LoadingState
          title="추천을 분석하고 있어요"
          description="예산·지역으로 후보를 좁히고 생활 취향 점수를 계산하는 중이에요."
        />
      </PageContainer>
    );
  }

  // 하드필터(예산·지역) 통과 0건
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

  return <UnifiedMapExplorer />;
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
