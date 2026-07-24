"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { LoadingState } from "@/components/common/states";
import { Disclaimer, InformationBanner } from "@/components/common/banners";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { QuestionCard } from "@/components/onboarding/QuestionCard";
import { FlowShell } from "@/components/onboarding/FlowShell";
import {
  BudgetStep,
  RegionStep,
  FrequentStep,
  InfraStep,
  EducationStep,
  StoreStep,
  NeighborhoodStep,
} from "@/components/preferences/PreferenceSteps";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { usePreferencesStore, isBudgetComplete } from "@/features/recommendation/preferences.store";
import { useHydrated } from "@/lib/use-hydrated";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { MOCK_HOUSING } from "@/mocks/housing";
import { cn } from "@/lib/utils";
import type { ScoreAxis } from "@/features/recommendation/recommendation.types";

type StepKey = "intro" | "budget" | "region" | "frequent" | "infra" | "education" | "store" | "neighborhood";
const ORDER: StepKey[] = ["intro", "budget", "region", "frequent", "infra", "education", "store", "neighborhood"];

const META: Record<Exclude<StepKey, "intro">, { title: string; desc: string; axis?: ScoreAxis; emphasis?: string }> = {
  budget: { title: "예산을 알려주세요", desc: "보증금과 월 임대료 상한을 정하면 예산 밖 주택을 제외해요." },
  region: { title: "희망 지역을 골라주세요", desc: "선택한 구·군의 주택만 후보로 남겨요." },
  frequent: { title: "자주 가는 장소가 있나요?", desc: "직장·학교 등 자주 가야 하는 곳을 추가하세요.", axis: "frequent", emphasis: "추천에 크게 반영" },
  infra: { title: "꼭 필요한 기반시설은?", desc: "선택한 시설이 가까운 주택을 높게 평가해요.", axis: "infra", emphasis: "추천에 크게 반영" },
  education: { title: "돌봄·교육이 필요하세요?", desc: "필요할 때만 시설 접근성을 반영해요.", axis: "education", emphasis: "추천에 반영" },
  store: { title: "어떤 가게가 많으면 좋아요?", desc: "선택 업종의 주변 밀도를 평가해요.", axis: "store", emphasis: "보조적으로 반영" },
  neighborhood: { title: "선호하는 동네 분위기는?", desc: "상권과의 거리로 분위기를 판단해요.", axis: "neighborhood", emphasis: "보조적으로 반영" },
};

export default function PreferencesPage() {
  const router = useRouter();
  const eligHydrated = useHydrated(useEligibilityStore);
  const prefHydrated = useHydrated(usePreferencesStore);
  const saved = useEligibilityStore((s) => s.savedResults);
  const pref = usePreferencesStore();
  const [idx, setIdx] = useState(0);
  const headingRef = useRef<HTMLDivElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (ORDER[idx] === "intro") headingRef.current?.focus();
    else questionHeadingRef.current?.focus();
  }, [idx]);

  if (!eligHydrated || !prefHydrated) {
    return (
      <PageContainer className="py-10">
        <LoadingState />
      </PageContainer>
    );
  }

  const passed = (saved ?? []).filter((r) => r.evaluation.status === "PASS");

  // 게이트: 1단계 통과 유형이 없으면 진입 불가
  if (passed.length === 0) {
    return (
      <PageContainer size="narrow" className="py-12">
        <Card>
          <CardBody className="text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
            <h1 className="text-xl font-bold">먼저 1단계 자격 확인이 필요해요</h1>
            <p className="mt-2 text-muted">
              2단계 취향 추천은 자격을 통과한 주택만을 대상으로 해요. 1단계를 완료하면 이어서 진행할 수 있어요.
            </p>
            <Link href="/eligibility" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-6")}>
              1단계 자격 확인하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  const passedTypes = new Set(passed.map((r) => r.type));
  const candidateCount = MOCK_HOUSING.filter((h) => passedTypes.has(h.type)).length;
  const step = ORDER[idx];
  const meta = step !== "intro" ? META[step] : null;

  const skippable = meta?.axis !== undefined;
  const isLastQuestion = step === "neighborhood";
  const goNext = () => setIdx((i) => i + 1);
  const goResults = () => router.push("/recommendations?fresh=1");

  // 다음: 이 축을 반영(skip=false)하고 진행/완료
  const handleNext = () => {
    if (meta?.axis) pref.setSkip(meta.axis, false);
    if (isLastQuestion) goResults();
    else goNext();
  };
  // 건너뛰기: 이 축을 제외(skip=true)하고 진행/완료
  const handleSkip = () => {
    if (meta?.axis) pref.setSkip(meta.axis, true);
    if (isLastQuestion) goResults();
    else goNext();
  };

  const nextDisabled = step === "budget" ? !isBudgetComplete(pref) : false;

  return (
    <FlowShell
      eyebrow="2단계 · 생활 적합도 높이기"
      title="생활 취향 설정"
      description="예산과 희망 지역을 먼저 정하고, 자주 가는 곳과 생활 취향을 추천 순서에 반영해요."
      narrow
      progress={
        meta ? (
          <p className="text-sm text-muted" aria-live="polite">
            {idx} / {ORDER.length - 1} 단계
            {meta.emphasis && (
            <Badge tone="neutral" className="ml-2">
                {meta.emphasis}
            </Badge>
            )}
          </p>
        ) : undefined
      }
      footer={
        <>
          {step === "intro" && (
            <InformationBanner tone="warning" className="mt-6">
              예산과 희망 지역은 반드시 맞아야 하는 조건이고, 생활 취향은 추천 순서를 정할 때만 사용해요.
            </InformationBanner>
          )}
          <Disclaimer className="mt-8" />
        </>
      }
    >

      <div ref={headingRef} tabIndex={-1} className="outline-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22 }}
          >
            {step === "intro" ? (
              <Card>
                <CardBody className="sm:p-8">
                  <h2 className="text-2xl font-bold">취향 추천을 시작할게요</h2>
                  <p className="mt-2 text-muted">이 단계는 신청 자격이 아니라 추천 순서를 정해요. 언제든 건너뛰거나 이전 단계에서 수정할 수 있어요.</p>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[var(--radius-input)] bg-primary-subtle p-4">
                      <p className="text-sm font-semibold text-primary">현재 신청 가능성이 있는 유형</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {passed.map((r) => (
                          <Badge key={r.type} tone="success">
                            {ELIGIBILITY_TYPE_LABEL[r.type]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[var(--radius-input)] bg-surface-muted p-4 text-sm text-fg">
                      후보 주택 <b className="text-primary">{candidateCount}곳</b>을 대상으로 예산·지역·생활 취향을 반영해 순서를 매겨요.
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button size="lg" onClick={() => setIdx(1)}>
                      시작하기 <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <QuestionCard
                title={meta!.title}
                headingRef={questionHeadingRef}
                description={meta!.desc}
                onPrev={() => setIdx((i) => i - 1)}
                onNext={handleNext}
                onSkip={skippable ? handleSkip : undefined}
                nextDisabled={nextDisabled}
                isLast={isLastQuestion}
              >
                {step === "budget" && <BudgetStep />}
                {step === "region" && <RegionStep />}
                {step === "frequent" && <FrequentStep />}
                {step === "infra" && <InfraStep />}
                {step === "education" && <EducationStep />}
                {step === "store" && <StoreStep />}
                {step === "neighborhood" && <NeighborhoodStep />}
              </QuestionCard>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </FlowShell>
  );
}
