"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { SkipForward } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { LoadingState } from "@/components/common/states";
import { MascotVideo } from "@/components/common/MascotVideo";
import { Disclaimer } from "@/components/common/banners";
import { Stepper } from "@/components/onboarding/Stepper";
import { QuestionCard } from "@/components/onboarding/QuestionCard";
import { SummarySidebar } from "@/components/onboarding/SummarySidebar";
import { FlowShell } from "@/components/onboarding/FlowShell";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { StepA, StepB, StepC, StepD } from "@/components/eligibility/CommonSteps";
import { DetailForm } from "@/components/eligibility/DetailForm";
import { Stage1Result, FinalSummary, ExitScreen } from "@/components/eligibility/ResultScreens";
import {
  buildCommonInput,
  isCommonComplete,
  isStepCComplete,
  useEligibilityStore,
} from "@/features/eligibility/eligibility.store";
import { calcKoreanAge } from "@/lib/formatting";
import { useHydrated } from "@/lib/use-hydrated";
import { evaluateAll, stage1Common } from "@/features/eligibility/eligibility.rules";
import { BASE_YEAR_BY_TYPE } from "@/config/eligibility-config.2025";
import type { EligibilityTypeResult } from "@/features/eligibility/eligibility.types";
import { usePreferencesStore } from "@/features/recommendation/preferences.store";

type Phase = "common" | "result1" | "detail" | "summary" | "exit";
type StepKey = "A" | "B" | "C" | "D";

const STEPS = [
  { key: "A", badge: "A", label: "주택 소유" },
  { key: "B", badge: "B", label: "가구·나이" },
  { key: "C", badge: "C", label: "소득·자산" },
  { key: "D", badge: "D", label: "지역" },
];

export default function EligibilityPage() {
  const router = useRouter();
  const hydrated = useHydrated(useEligibilityStore);
  const store = useEligibilityStore();
  const setEligibilitySkipped = usePreferencesStore((s) => s.setEligibilitySkipped);
  const [phase, setPhase] = useState<Phase>("common");
  const [step, setStep] = useState<StepKey>("A");
  const [gateOpen, setGateOpen] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const headingRef = useRef<HTMLDivElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  // 복구: 이미 공통 입력이 완료돼 있으면 결과 화면부터 시작
  const startedRef = useRef(false);
  useEffect(() => {
    if (hydrated && !startedRef.current) {
      startedRef.current = true;
      // 이미 공통 입력이 완료돼 있으면 결과 화면부터 복구 (다음 틱으로 지연해 cascading render 방지)
      const complete = isCommonComplete(store);
      if (complete) {
        const id = setTimeout(() => setPhase("result1"), 0);
        return () => clearTimeout(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // 단계 변경 시 제목으로 포커스 이동(스크린리더 안내)
  useEffect(() => {
    if (phase === "common") questionHeadingRef.current?.focus();
    else headingRef.current?.focus();
  }, [step, phase]);

  if (!hydrated) {
    return (
      <PageContainer className="py-10">
        <LoadingState title="이전 입력을 확인하고 있어요" />
      </PageContainer>
    );
  }

  const completedKeys = stepCompleted(store);
  const goEditCommon = () => {
    store.invalidateDetail();
    setPhase("common");
    setStep("A");
  };

  const handleStepNext = () => {
    setEligibilitySkipped(false);
    if (step === "A") {
      if (store.ownSelfHouse) {
        setGateOpen(true);
        return;
      }
      setStep("B");
    } else if (step === "B") setStep("C");
    else if (step === "C") setStep("D");
    else if (step === "D") setPhase("result1");
  };

  const handleStepPrev = () => {
    if (step === "B") setStep("A");
    else if (step === "C") setStep("B");
    else if (step === "D") setStep("C");
  };

  const stepValid = validateStep(step, store);

  const common = phase !== "common" ? buildCommonInput(store) : null;
  const s1Results: EligibilityTypeResult[] = common
    ? mapStage1(common)
    : [];
  const candidates = common ? stage1Common(common).candidates : [];
  const finalResults: EligibilityTypeResult[] = common ? evaluateAll(common, store.detail) : [];

  const showTwoCol = phase === "common";

  return (
    <FlowShell
      eyebrow="1단계 · 신청 가능성 확인"
      title="공공임대 자격 확인"
      description="복잡한 기준을 쉬운 질문으로 확인해요. 입력 내용은 이 브라우저에만 저장됩니다."
      narrow={!showTwoCol}
      progress={
        phase === "common" ? (
          <Stepper steps={STEPS} currentKey={step} completedKeys={completedKeys} />
        ) : (
          <p className="rounded-[var(--radius-input)] bg-primary-subtle px-4 py-3 text-sm font-medium text-primary">
            {phase === "detail" ? "세부 자격 확인 중" : phase === "summary" ? "자격 확인 완료" : "공통 자격 확인 완료"}
          </p>
        )
      }
      aside={
        showTwoCol ? (
          <div className="hidden flex-col gap-4 lg:flex">
            <div className="overflow-hidden rounded-[var(--radius-cardlg)] border border-border bg-surface shadow-[var(--shadow-card)]">
              <MascotVideo
                src="read"
                poster="readDocument"
                fullPoster
                className="aspect-video w-full"
                objectClassName="object-cover"
              />
              <div className="p-4">
                <p className="text-sm font-bold text-primary">갈붕이가 함께해요</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  복잡한 자격 조건, 어려운 서류 용어 없이 질문에 답만 하면 신청 가능성이 있는 유형을 확인해 드려요.
                </p>
              </div>
            </div>
            <SummarySidebar />
          </div>
        ) : undefined
      }
      footer={<Disclaimer className="mt-8" />}
    >
      <div ref={headingRef} tabIndex={-1} className="outline-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase + step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {phase === "common" && (
              <>
                {step === "A" && (
                  <div className="mb-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEligibilitySkipped(true);
                        router.push("/preferences");
                      }}
                    >
                      자격 확인 건너뛰기 <SkipForward className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                )}
                <QuestionCard
                  title={stepTitle(step)}
                  eyebrow={`STEP ${step} · ${STEPS.findIndex((s) => s.key === step) + 1}/${STEPS.length}`}
                  headingRef={questionHeadingRef}
                  description={stepDesc(step)}
                  onPrev={step === "A" ? undefined : handleStepPrev}
                  onNext={handleStepNext}
                  nextDisabled={!stepValid}
                  isLast={step === "D"}
                >
                  {step === "A" && <StepA />}
                  {step === "B" && <StepB />}
                  {step === "C" && <StepC />}
                  {step === "D" && <StepD />}
                </QuestionCard>
              </>
            )}

            {phase === "result1" &&
              (candidates.length === 0 ? (
                <ExitScreen reason="공통 자격(무주택·소득·자산·지역) 조건을 충족하는 유형이 없어요." onEdit={goEditCommon} />
              ) : (
                <Stage1Result results={s1Results} onEdit={goEditCommon} onContinue={() => setPhase("detail")} />
              ))}

            {phase === "detail" && (
              <DetailForm
                candidates={candidates}
                onBack={() => setPhase("result1")}
                onComplete={() => {
                  store.saveResults(finalResults);
                  setPhase("summary");
                }}
              />
            )}

            {phase === "summary" && <FinalSummary results={finalResults} onEdit={goEditCommon} />}
            {phase === "exit" && <ExitScreen reason={exitReason} onEdit={goEditCommon} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmationDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onConfirm={() => {
          setExitReason("본인 명의 주택을 소유하고 있어 모든 공공임대 유형 신청이 어려워요.");
          setPhase("exit");
        }}
        title="이 경우 신청이 어려울 수 있어요"
        description="본인 명의 주택을 소유하고 있으면 공공임대 신청 대상이 아니에요. 결과 안내를 확인할까요?"
        confirmLabel="결과 확인"
        cancelLabel="답변 수정"
      />
    </FlowShell>
  );
}

// helpers ---------------------------------------------------------------

function mapStage1(common: NonNullable<ReturnType<typeof buildCommonInput>>): EligibilityTypeResult[] {
  const s1 = stage1Common(common);
  return (Object.keys(s1.perType) as (keyof typeof s1.perType)[]).map((type) => ({
    type,
    evaluation: s1.perType[type],
    baseYear: BASE_YEAR_BY_TYPE[type],
  }));
}

function stepTitle(step: StepKey): string {
  return {
    A: "주택 소유 여부를 확인할게요",
    B: "가구원과 나이를 알려주세요",
    C: "소득과 자산을 입력해 주세요",
    D: "거주 지역을 확인할게요",
  }[step];
}
function stepDesc(step: StepKey): string {
  return {
    A: "무주택 세대만 공공임대를 신청할 수 있어요. 세 가지만 확인해 주세요.",
    B: "가구원수와 만 나이는 소득·자산 기준을 정하는 축이 돼요.",
    C: "정확한 금액이 어려우면 범위로 선택해도 괜찮아요.",
    D: "부산 거주 여부에 따라 신청 가능한 유형이 달라져요.",
  }[step];
}

function validateStep(step: StepKey, s: ReturnType<typeof useEligibilityStore.getState>): boolean {
  switch (step) {
    case "A":
      return s.ownSelfHouse !== null && s.ownMemberHouse !== null && s.hasRestriction !== null;
    case "B":
      return calcKoreanAge(s.birthISO) !== null;
    case "C":
      return isStepCComplete(s);
    case "D":
      return s.livesInBusan !== null;
  }
}

function stepCompleted(s: ReturnType<typeof useEligibilityStore.getState>): string[] {
  const done: string[] = [];
  if (validateStep("A", s)) done.push("A");
  if (validateStep("B", s)) done.push("B");
  if (validateStep("C", s)) done.push("C");
  if (validateStep("D", s)) done.push("D");
  return done;
}
