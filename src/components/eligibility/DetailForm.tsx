"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QuestionCard } from "@/components/onboarding/QuestionCard";
import { CheckCards, RadioCards } from "@/components/ui/selectable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InformationBanner } from "@/components/common/banners";
import { formatWon } from "@/lib/formatting";
import { baseYearNote } from "@/features/eligibility/eligibility.service";
import {
  birthReliefAsks,
  birthReliefMissing,
  type BirthReliefType,
} from "@/features/eligibility/eligibility.rules";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import {
  MARRIAGE_MONTHS_MAX,
  SENIOR_AGE,
  isSharedTierType,
  needsMarriageFollowUp,
  needsStudentFollowUp,
  relevantTierAttrs,
  tierStepComplete,
} from "@/features/eligibility/eligibility.tiers";
import { ELIGIBILITY_TYPE_LABEL, TIER_ATTR_LABEL } from "@/features/eligibility/eligibility.types";
import type {
  BirthReliefAnswer,
  EligibilityCommonInput,
  EligibilityDetailInput,
  EligibilityTypeCode,
  StudentStatus,
  TierAttr,
} from "@/features/eligibility/eligibility.types";

const YESNO = [
  { value: "no", label: "아니오" },
  { value: "yes", label: "예" },
];

/** 계층을 공유하지 않아 유형별로 따로 묻는 유형. */
type SingleType = Exclude<EligibilityTypeCode, "TONGHAP" | "HAENGBOK">;

/** 세부 자격 단계. 통합·행복은 계층이 겹치므로 'tiers' 한 단계로 합친다. */
type DetailStep = { kind: "tiers" } | { kind: "type"; type: SingleType };

function buildSteps(candidates: EligibilityTypeCode[]): DetailStep[] {
  const steps: DetailStep[] = [];
  if (candidates.some(isSharedTierType)) steps.push({ kind: "tiers" });
  for (const type of candidates) {
    if (!isSharedTierType(type)) steps.push({ kind: "type", type });
  }
  return steps;
}

function NumberField({
  label,
  suffix,
  value,
  max,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number | undefined;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block font-medium text-fg">{label}</span>
      <span className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          className="max-w-[200px]"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        {suffix && <span className="text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

/** 조건부로 나타나는 후속 문항 묶음. */
function FollowUp({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-[var(--radius-card)] border border-border bg-surface-muted/50 p-4"
    >
      {children}
    </motion.div>
  );
}

export function DetailForm({
  candidates,
  common,
  onComplete,
  onBack,
}: {
  candidates: EligibilityTypeCode[];
  /** 1-1 확정 입력. 만 나이('고령자' 자동 판정)와 출산완화 재확인 문항 산출에 쓴다. */
  common: EligibilityCommonInput;
  onComplete: () => void;
  onBack: () => void;
}) {
  const { detail, setDetail, toggleTierAttr, setTierFollowUp, syncSeniorAttr } = useEligibilityStore();
  const [idx, setIdx] = useState(0);

  const steps = useMemo(() => buildSteps(candidates), [candidates]);
  const step = steps[Math.min(idx, steps.length - 1)];

  // '고령자'는 만 나이로만 결정된다(체크·잠금). 스텝 B가 확정된 이 시점에만 유효하다.
  const isSenior = common.ageYears >= SENIOR_AGE;
  useEffect(() => {
    if (steps.some((s) => s.kind === "tiers")) syncSeniorAttr(isSenior);
  }, [isSenior, steps, syncSeniorAttr]);

  const patch = (type: SingleType, value: Record<string, unknown>) => {
    const cur = ((detail as Record<string, unknown>)[type] as Record<string, unknown>) ?? {};
    setDetail({ ...detail, [type]: { ...cur, ...value } } as EligibilityDetailInput);
  };

  const complete =
    step.kind === "tiers"
      ? tierStepComplete(detail.tiers, candidates)
      : isTypeComplete(step.type, detail, common);

  const sharedLabels = candidates.filter(isSharedTierType).map((t) => ELIGIBILITY_TYPE_LABEL[t]);

  return (
    <QuestionCard
      title={
        step.kind === "tiers"
          ? "해당하는 상황을 모두 선택해 주세요"
          : `${ELIGIBILITY_TYPE_LABEL[step.type]} 세부 자격`
      }
      description={
        step.kind === "tiers"
          ? `${sharedLabels.join("·")}의 계층을 한 번에 확인해요. 여러 개에 해당하면 모두 선택하세요.`
          : "후보로 남은 유형만 물어봐요. 선택에 따라 소득·자산 기준이 달라져요."
      }
      onPrev={() => (idx > 0 ? setIdx(idx - 1) : onBack())}
      onNext={() => (idx < steps.length - 1 ? setIdx(idx + 1) : onComplete())}
      nextDisabled={!complete}
      isLast={idx === steps.length - 1}
      nextLabel="다음"
    >
      <div className="mb-4 flex items-center gap-2">
        <Badge tone="primary">
          {idx + 1} / {steps.length}
        </Badge>
        <span className="text-sm text-muted">
          {step.kind === "tiers"
            ? `${sharedLabels.join("·")}이(가) 이 답변을 함께 사용해요.`
            : `현재 ${ELIGIBILITY_TYPE_LABEL[step.type]}의 세부 자격을 확인하고 있어요.`}
        </span>
      </div>

      {step.kind === "type" && baseYearNote(step.type) && (
        <InformationBanner tone="warning" className="mb-5">
          {baseYearNote(step.type)}
        </InformationBanner>
      )}

      {step.kind === "tiers" ? (
        <TierStep
          candidates={candidates}
          isSenior={isSenior}
          detail={detail}
          onToggle={toggleTierAttr}
          onFollowUp={setTierFollowUp}
        />
      ) : (
        renderQuestions(step.type, detail, common, (v) => patch(step.type, v))
      )}
    </QuestionCard>
  );
}

/** 통합·행복 공통 계층 문항 + 조건부 후속 문항. */
function TierStep({
  candidates,
  isSenior,
  detail,
  onToggle,
  onFollowUp,
}: {
  candidates: EligibilityTypeCode[];
  isSenior: boolean;
  detail: EligibilityDetailInput;
  onToggle: (attr: TierAttr) => void;
  onFollowUp: (v: { marriageMonths?: number; dualIncome?: boolean; studentStatus?: StudentStatus }) => void;
}) {
  const shared = detail.tiers;
  const attrs = shared?.attrs ?? [];
  const options = relevantTierAttrs(candidates).map((attr) => ({
    value: attr,
    label: TIER_ATTR_LABEL[attr],
    // 고령자는 만 나이로 자동 판정되므로 직접 바꿀 수 없다.
    ...(attr === "고령자"
      ? {
          disabled: true,
          description: isSenior
            ? `만 ${SENIOR_AGE}세 이상이라 자동 적용됐어요`
            : `만 ${SENIOR_AGE}세 이상만 해당 — 나이로 자동 판정`,
        }
      : {}),
  }));

  const showMarriage = needsMarriageFollowUp(attrs);
  const showStudent = needsStudentFollowUp(attrs, candidates);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-1 font-semibold text-fg">해당하는 상황 (중복 선택 가능)</legend>
        <p className="mb-3 text-sm text-muted">
          계층은 택일이 아니라 사실이에요. 여러 계층에 해당하면 가장 유리한 기준으로 판정해 드려요.
        </p>
        <CheckCards<TierAttr> values={attrs} onToggle={onToggle} options={options} columns={2} />
        {attrs.length === 0 && (
          <p className="mt-3 text-sm font-semibold text-error" role="alert">
            최소 1개는 선택해 주세요.
          </p>
        )}
      </fieldset>

      {candidates.includes("HAENGBOK") && candidates.includes("TONGHAP") && (
        <p className="text-sm text-muted">
          대학생·사회초년생은 행복주택에만 있는 계층이라 통합공공임대 판정에는 쓰이지 않아요.
        </p>
      )}

      <AnimatePresence initial={false}>
        {showMarriage && (
          <FollowUp key="marriage">
            <p className="mb-3 text-sm font-bold text-primary">신혼·한부모 확인</p>
            <NumberField
              label={`혼인신고 후 몇 개월 지났나요? (${MARRIAGE_MONTHS_MAX}개월 이내)`}
              suffix="개월"
              max={MARRIAGE_MONTHS_MAX}
              value={shared?.marriageMonths}
              onChange={(n) => onFollowUp({ marriageMonths: n })}
            />
            <fieldset>
              <legend className="mb-3 font-semibold">본인·배우자 모두 소득이 있나요?</legend>
              <RadioCards
                name="tier-dual"
                columns={2}
                value={shared?.dualIncome === undefined ? null : shared.dualIncome ? "yes" : "no"}
                onChange={(v) => onFollowUp({ dualIncome: v === "yes" })}
                options={YESNO}
              />
              <p className="mt-2 text-sm text-muted">
                맞벌이면 통합공공임대·행복주택 모두 소득 상한이 올라가요. 한 번만 입력하면 두 유형에 함께 반영돼요.
              </p>
            </fieldset>
          </FollowUp>
        )}

        {showStudent && (
          <FollowUp key="student">
            <p className="mb-3 text-sm font-bold text-primary">행복주택 대학생·사회초년생 확인</p>
            <fieldset>
              <legend className="mb-3 font-semibold">현재 상태는?</legend>
              <RadioCards<StudentStatus>
                name="tier-student"
                columns={3}
                value={shared?.studentStatus ?? null}
                onChange={(v) => onFollowUp({ studentStatus: v })}
                options={[
                  { value: "재학", label: "재학 중" },
                  { value: "졸업2년내", label: "졸업 2년 내" },
                  { value: "소득활동5년내", label: "소득활동 5년 내" },
                ]}
              />
            </fieldset>
          </FollowUp>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 출산 가구 완화 컷 재확인. 1-1의 구간 선택은 완화 컷(총자산 +10/20%, 자동차 4,996·5,450만원)을
 *  표현하지 못하므로, 출산0 컷을 넘긴 항목만 완화 컷으로 다시 묻는다. */
function BirthReliefAsk({
  type,
  common,
  childCount,
  relief,
  onChange,
}: {
  type: BirthReliefType;
  common: EligibilityCommonInput;
  childCount: number | undefined;
  relief: BirthReliefAnswer | undefined;
  onChange: (v: BirthReliefAnswer) => void;
}) {
  const asks = birthReliefAsks(type, common, childCount);
  if (asks.asset === undefined && asks.car === undefined) return null;
  const yesno = (v: boolean | undefined) => (v === undefined ? null : v ? "yes" : "no");

  return (
    <FollowUp>
      <p className="mb-3 text-sm font-bold text-primary">출산 가구 완화 기준 확인</p>
      <p className="mb-4 text-sm text-muted">
        출산 자녀가 있으면 총자산·자동차 기준이 완화돼요. 앞서 고른 구간만으로는 완화 기준을 알 수 없어
        한 번만 더 여쭤봐요.
      </p>
      {asks.asset !== undefined && (
        <fieldset className="mb-4">
          <legend className="mb-3 font-semibold">
            세대 총자산이 {formatWon(asks.asset)} 이하인가요?
          </legend>
          <RadioCards
            name={`${type}-relief-asset`}
            columns={2}
            value={yesno(relief?.asset)}
            onChange={(v) => onChange({ ...relief, asset: v === "yes" })}
            options={YESNO}
          />
        </fieldset>
      )}
      {asks.car !== undefined && (
        <fieldset>
          <legend className="mb-3 font-semibold">
            가장 비싼 자동차 1대의 가액이 {formatWon(asks.car)} 이하인가요?
          </legend>
          <RadioCards
            name={`${type}-relief-car`}
            columns={2}
            value={yesno(relief?.car)}
            onChange={(v) => onChange({ ...relief, car: v === "yes" })}
            options={YESNO}
          />
        </fieldset>
      )}
    </FollowUp>
  );
}

function renderQuestions(
  type: SingleType,
  detail: EligibilityDetailInput,
  common: EligibilityCommonInput,
  patch: (v: Record<string, unknown>) => void,
) {
  if (type === "JAEGAEBAL") {
    const d = detail.JAEGAEBAL;
    return (
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 font-semibold">2023.3.28 이후 출산(입양·태아 포함) 자녀 수는?</legend>
          <RadioCards
            name="jaegaebal-children"
            columns={3}
            // 자녀 수가 바뀌면 완화 컷도 바뀌므로 이전 재확인 답변은 버린다.
            value={d ? String(d.children) : null}
            onChange={(v) => patch({ children: Number(v), relief: undefined })}
            options={[
              { value: "0", label: "0명" },
              { value: "1", label: "1명" },
              { value: "2", label: "2명 이상" },
            ]}
          />
        </fieldset>
        <AnimatePresence initial={false}>
          <BirthReliefAsk
            type="JAEGAEBAL"
            common={common}
            childCount={d?.children}
            relief={d?.relief}
            onChange={(relief) => patch({ relief })}
          />
        </AnimatePresence>
      </div>
    );
  }

  if (type === "MAEIP_ILBAN") {
    const d = detail.MAEIP_ILBAN;
    return (
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 font-semibold">수급·한부모·차상위·65세·장애인에 해당하나요? (1순위)</legend>
          <RadioCards
            name="ilban-rank1"
            columns={2}
            value={d?.isRank1 === undefined ? null : d.isRank1 ? "yes" : "no"}
            onChange={(v) => patch({ isRank1: v === "yes" })}
            options={[
              { value: "yes", label: "예 (1순위)" },
              { value: "no", label: "아니오 (2순위)" },
            ]}
          />
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-semibold">2023.3.28 이후 출산 자녀 수는?</legend>
          <RadioCards
            name="ilban-children"
            columns={3}
            value={d?.children !== undefined ? String(d.children) : null}
            onChange={(v) => patch({ children: Number(v), relief: undefined })}
            options={[
              { value: "0", label: "0명" },
              { value: "1", label: "1명" },
              { value: "2", label: "2명 이상" },
            ]}
          />
        </fieldset>
        <AnimatePresence initial={false}>
          <BirthReliefAsk
            type="MAEIP_ILBAN"
            common={common}
            childCount={d?.children}
            relief={d?.relief}
            onChange={(relief) => patch({ relief })}
          />
        </AnimatePresence>
        <p className="text-sm text-muted">1순위는 소득 무관, 2순위는 도시근로자 소득 50% 기준이 적용돼요.</p>
      </div>
    );
  }

  // MAEIP_CHUNG
  const d = detail.MAEIP_CHUNG;
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 font-semibold">
          본인(또는 같은 세대 부모)이 생계·의료·주거급여 수급자, 한부모가족, 차상위계층에 해당하나요?
        </legend>
        <RadioCards
          name="chung-rank1"
          columns={2}
          value={d?.isRank1 === undefined ? null : d.isRank1 ? "yes" : "no"}
          onChange={(v) => patch({ isRank1: v === "yes", rank: undefined })}
          options={[
            { value: "yes", label: "예 (1순위)" },
            { value: "no", label: "아니오" },
          ]}
        />
      </fieldset>
      {d?.isRank1 === false && (
        <fieldset>
          <legend className="mb-3 font-semibold">부모님의 소득·자산 정보를 입력할 수 있나요?</legend>
          <RadioCards
            name="chung-rank"
            columns={2}
            value={d?.rank ? String(d.rank) : null}
            onChange={(v) => patch({ rank: Number(v) })}
            options={[
              { value: "2", label: "입력할 수 있어요", description: "부모 정보를 받아 2순위를 먼저 확인해요." },
              { value: "3", label: "입력이 어려워요", description: "본인 정보로 3순위를 확인해요." },
            ]}
          />
        </fieldset>
      )}
      {d?.isRank1 === false && d?.rank === 2 && (
        <div>
          <NumberField label="부모의 월평균 소득" suffix="만원" value={d?.parentIncomeManwon} onChange={(n) => patch({ parentIncomeManwon: n })} />
          <NumberField label="부모의 총자산" suffix="만원" value={d?.parentAssetManwon} onChange={(n) => patch({ parentAssetManwon: n })} />
          <p className="text-sm text-muted">
            본인+부모 기준이 2순위를 넘으면, 입력한 본인 정보로 3순위를 자동 확인해요.
          </p>
        </div>
      )}
    </div>
  );
}

function isTypeComplete(
  type: SingleType,
  detail: EligibilityDetailInput,
  common: EligibilityCommonInput,
): boolean {
  /** 뜬 재확인 문항에 모두 답했는지. */
  const reliefDone = (t: BirthReliefType, d: { children: number; relief?: BirthReliefAnswer }) =>
    !birthReliefMissing(birthReliefAsks(t, common, d.children), d.relief);

  switch (type) {
    case "JAEGAEBAL": {
      const d = detail.JAEGAEBAL;
      return d?.children !== undefined && reliefDone("JAEGAEBAL", d);
    }
    case "MAEIP_ILBAN": {
      const d = detail.MAEIP_ILBAN;
      if (d?.isRank1 === undefined || d?.children === undefined) return false;
      return reliefDone("MAEIP_ILBAN", d);
    }
    case "MAEIP_CHUNG": {
      const d = detail.MAEIP_CHUNG;
      if (d?.isRank1 === undefined) return false;
      if (d.isRank1) return true;
      if (!d.rank) return false;
      if (d.rank === 2) return d.parentIncomeManwon !== undefined && d.parentAssetManwon !== undefined;
      return true;
    }
    default:
      return false;
  }
}
