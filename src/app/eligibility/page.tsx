"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageContainer } from "@/components/common/PageContainer";
import { LoadingState } from "@/components/common/states";
import { Disclaimer } from "@/components/common/banners";
import { Stepper } from "@/components/onboarding/Stepper";
import { QuestionCard } from "@/components/onboarding/QuestionCard";
import { SummarySidebar } from "@/components/onboarding/SummarySidebar";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { StepA, StepB, StepC, StepD } from "@/components/eligibility/CommonSteps";
import { DetailForm } from "@/components/eligibility/DetailForm";
import { Stage1Result, FinalSummary, ExitScreen } from "@/components/eligibility/ResultScreens";
import {
  buildCommonInput,
  isCommonComplete,
  useEligibilityStore,
} from "@/features/eligibility/eligibility.store";
import { calcKoreanAge } from "@/lib/formatting";
import { useHydrated } from "@/lib/use-hydrated";
import { evaluateAll, stage1Common } from "@/features/eligibility/eligibility.rules";
import { BASE_YEAR_BY_TYPE } from "@/config/eligibility-config.2025";
import type { EligibilityTypeResult } from "@/features/eligibility/eligibility.types";

type Phase = "common" | "result1" | "detail" | "summary" | "exit";
type StepKey = "A" | "B" | "C" | "D";

const STEPS = [
  { key: "A", badge: "A", label: "주택 소유" },
  { key: "B", badge: "B", label: "가구·나이" },
  { key: "C", badge: "C", label: "소득·자산" },
  { key: "D", badge: "D", label: "지역" },
];

export default function EligibilityPage() {
  const hydrated = useHydrated(useEligibilityStore);
  const store = useEligibilityStore();
  const [phase, setPhase] = useState<Phase>("common");
  const [step, setStep] = useState<StepKey>("A");
  const [gateOpen, setGateOpen] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const headingRef = useRef<HTMLDivElement>(null);

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
    headingRef.current?.focus();
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
    <PageContainer size={showTwoCol ? "wide" : "narrow"} className="py-8">
      <div className="mb-2">
        <p className="text-sm font-semibold text-primary">1단계 자격 확인</p>
      </div>
      <div className="mb-6">
        {phase === "common" ? (
          <Stepper steps={STEPS} currentKey={step} completedKeys={completedKeys} />
        ) : (
          <p className="text-sm text-muted">
            {phase === "detail" ? "세부 자격 확인 중" : phase === "summary" ? "자격 확인 완료" : "공통 자격 확인 완료"}
          </p>
        )}
      </div>

      <div ref={headingRef} tabIndex={-1} className="outline-none">
        <div className={showTwoCol ? "grid gap-6 lg:grid-cols-[1fr_320px]" : ""}>
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                {phase === "common" && (
                  <QuestionCard
                    title={stepTitle(step)}
                    description={stepDesc(step)}
                    onPrev={step === "A" ? undefined : handleStepPrev}
                    onNext={handleStepNext}
                    nextDisabled={!stepValid}
                    isLast={step === "D"}
                    remainingHint="남은 시간 약 2분"
                  >
                    {step === "A" && <StepA />}
                    {step === "B" && <StepB />}
                    {step === "C" && <StepC />}
                    {step === "D" && <StepD />}
                  </QuestionCard>
                )}

                {phase === "result1" &&
                  (candidates.length === 0 ? (
                    <ExitScreen reason="공통 자격(무주택·소득·자산·지역) 조건을 충족하는 유형이 없어요." onEdit={goEditCommon} />
                  ) : (
                    <Stage1Result
                      results={s1Results}
                      onEdit={goEditCommon}
                      onContinue={() => setPhase("detail")}
                    />
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

                {phase === "exit" && (
                  <ExitScreen reason={exitReason} onEdit={goEditCommon} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {showTwoCol && <SummarySidebar className="hidden lg:block" />}
        </div>
      </div>

      <Disclaimer className="mt-8" />

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
    </PageContainer>
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
    B: "가구원 수와 만 나이는 소득·자산 기준의 축이 돼요.",
    C: "정확한 금액 대신 범위만 선택하면 돼요.",
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
      return s.incomeBracketIndex !== null && s.assetBracketIndex !== null && s.carBand !== null;
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
