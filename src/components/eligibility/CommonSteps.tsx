"use client";

import { Plus, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { ASSET_BRACKETS, CAR_OPTIONS, incomeBrackets } from "@/features/eligibility/eligibility.brackets";
import type { CarBand, MemberRelation } from "@/features/eligibility/eligibility.types";
import { RadioCards } from "@/components/ui/selectable";
import { InfoAccordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { InformationBanner } from "@/components/common/banners";
import { calcKoreanAge, withThousands } from "@/lib/formatting";
import type { Bracket } from "@/features/eligibility/eligibility.brackets";

const YESNO = (yesLabel: string, noLabel: string) => [
  { value: "no", label: noLabel },
  { value: "yes", label: yesLabel },
];

function Field({ legend, help, children }: { legend: string; help?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6 last:mb-0">
      <legend className="mb-1 font-semibold text-fg">{legend}</legend>
      {help && <p className="mb-3 text-sm text-muted">{help}</p>}
      {children}
    </fieldset>
  );
}

const boolToVal = (b: boolean | null) => (b === null ? null : b ? "yes" : "no");

/** 스텝 A — 주택 소유 (게이트) */
export function StepA() {
  const { ownSelfHouse, ownMemberHouse, hasRestriction, setStepA } = useEligibilityStore();
  return (
    <div>
      <Field legend="현재 본인 명의로 소유한 주택이 있나요?" help="무주택 세대만 공공임대를 신청할 수 있어요.">
        <RadioCards
          name="ownSelf"
          columns={2}
          value={boolToVal(ownSelfHouse)}
          onChange={(v) => setStepA({ ownSelfHouse: v === "yes" })}
          options={YESNO("있음", "없음(무주택)")}
        />
      </Field>
      <Field
        legend="본인 외 세대원(주민등록상 함께 등재된 가족) 중 주택을 소유한 사람이 있나요?"
        help="세대원이 본인뿐이면 ‘없음’을 선택하세요."
      >
        <RadioCards
          name="ownMember"
          columns={2}
          value={boolToVal(ownMemberHouse)}
          onChange={(v) => setStepA({ ownMemberHouse: v === "yes" })}
          options={YESNO("있음", "없음")}
        />
      </Field>
      <Field
        legend="현재 공공임대에 살고 있거나, 불법 전대·양도(4년 내)·재당첨 제한에 해당하나요?"
        help="정확하지 않다면 공식 기관에서 제한 여부를 확인해 주세요."
      >
        <RadioCards
          name="restriction"
          columns={2}
          value={boolToVal(hasRestriction)}
          onChange={(v) => setStepA({ hasRestriction: v === "yes" })}
          options={YESNO("있음", "없음")}
        />
      </Field>
    </div>
  );
}

const RELATIONS: { value: MemberRelation; label: string }[] = [
  { value: "SPOUSE", label: "배우자" },
  { value: "PARENT", label: "부모" },
  { value: "CHILD", label: "자녀" },
  { value: "FETUS", label: "태아" },
];
const RELATION_LABEL: Record<MemberRelation, string> = {
  SELF: "본인",
  SPOUSE: "배우자",
  PARENT: "부모",
  CHILD: "자녀",
  FETUS: "태아",
};

/** 스텝 B — 가구·나이 */
export function StepB() {
  const { birthISO, setBirth, members, addMember, removeMember } = useEligibilityStore();
  const age = calcKoreanAge(birthISO);
  return (
    <div>
      <InformationBanner tone="primary" className="mb-6" title="가구원은 주민등록상 관계를 기준으로 입력해요">
        본인·배우자·직계존속(부모·조부모, 배우자 부모 포함)·미성년 자녀·성년 자녀·태아를 포함하고,
        형제자매와 단순 동거인은 제외해요.
      </InformationBanner>
      <Field legend="생년월일을 입력해 주세요" help="만 나이는 자동으로 계산돼요.">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            className="max-w-[220px]"
            value={birthISO}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirth(e.target.value)}
            aria-label="생년월일"
          />
          {age !== null && (
            <span className="rounded-full bg-primary-subtle px-3 py-1.5 text-sm font-semibold text-primary">
              만 {age}세
            </span>
          )}
        </div>
      </Field>

      <Field
        legend="주민등록상 세대구성원을 관계별로 알려주세요"
        help="본인은 기본 포함돼요. 같은 관계가 여러 명이면 필요한 만큼 추가하세요."
      >
        <ul className="mb-3 flex flex-wrap gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
            >
              {RELATION_LABEL[m.relation]}
              {m.relation !== "SELF" && (
                <button
                  type="button"
                  aria-label={`${RELATION_LABEL[m.relation]} 삭제`}
                  onClick={() => removeMember(m.id)}
                  className="rounded-full p-0.5 text-muted hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {RELATIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => addMember(r.value)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/40 bg-surface px-4 text-sm font-medium text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            >
              <Plus className="h-4 w-4" /> {r.label}
            </button>
          ))}
        </div>
        <InfoAccordion summary="태아도 가구원에 포함되나요?" className="mt-4">
          네. 임신 중인 태아는 가구원 수와 일부 유형의 완화 기준에 포함될 수 있어요. 실제 인정 여부는 모집공고 기준으로
          확인해요.
        </InfoAccordion>
      </Field>
    </div>
  );
}

function bracketIndexForValue(value: number, brackets: Bracket[]): number {
  const index = brackets.findIndex((bracket) => value <= bracket.repManwon);
  return index === -1 ? brackets.length - 1 : index;
}

function AmountRange({
  label,
  value,
  max,
  step,
  marks,
  onChange,
}: {
  label: string;
  value: number | null;
  max: number;
  step: number;
  marks: { value: number; label: string }[];
  onChange: (value: number) => void;
}) {
  const current = Math.min(value ?? 0, max);
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-muted">슬라이더를 움직이거나 금액을 직접 입력하세요.</p>
        <label className="flex items-center gap-2">
          <span className="sr-only">{label}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value ?? ""}
            onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
            aria-label={`${label}, 만원 단위 직접 입력`}
            className="w-full sm:w-44"
          />
          <span className="shrink-0 text-sm text-muted">만원</span>
        </label>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={current}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label}, 슬라이더`}
        className="preference-range w-full"
        style={{ "--range-progress": `${(current / max) * 100}%` } as CSSProperties}
      />
      <div className="mt-3 flex justify-between gap-2 text-xs text-muted" aria-hidden>
        {marks.map((mark) => (
          <span key={mark.value} className="text-center">
            {mark.label}
          </span>
        ))}
      </div>
      {value !== null && (
        <p className="mt-3 rounded-[var(--radius-input)] bg-surface-muted px-4 py-3 text-sm text-fg">
          입력 금액 <b>{withThousands(value)}만원</b>
        </p>
      )}
    </div>
  );
}

/** 스텝 C — 소득·자산 */
export function StepC() {
  const {
    members,
    incomeBracketIndex,
    assetBracketIndex,
    incomeManwonExact,
    assetManwonExact,
    carBand,
    setStepC,
  } = useEligibilityStore();
  const size = Math.min(Math.max(members.length, 1), 8);
  const incomeOptions = incomeBrackets(size);
  const finiteIncome = incomeOptions.filter((bracket) => Number.isFinite(bracket.repManwon));
  const incomeMax = Math.ceil((finiteIncome.at(-1)?.repManwon ?? 1000) * 1.25 / 10) * 10;
  const incomeValue =
    incomeManwonExact ??
    (incomeBracketIndex !== null && Number.isFinite(incomeOptions[incomeBracketIndex].repManwon)
      ? incomeOptions[incomeBracketIndex].repManwon
      : null);
  const assetValue =
    assetManwonExact ??
    (assetBracketIndex !== null && Number.isFinite(ASSET_BRACKETS[assetBracketIndex].repManwon)
      ? ASSET_BRACKETS[assetBracketIndex].repManwon
      : null);
  const carOpts = CAR_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  const incomeLegend =
    size === 1
      ? "본인의 월평균 소득(세전)은 얼마인가요?"
      : "본인 포함 세대구성원 전원의 월소득 합계는 얼마인가요?";
  const assetLegend =
    size === 1 ? "본인이 보유한 총자산은 얼마인가요?" : "세대구성원 전원의 총자산 합계는 얼마인가요?";

  return (
    <div>
      <InformationBanner tone="primary" className="mb-6" title={`${size}인 가구 기준으로 확인해요`}>
        청년은 본인 기준, 그 외는 세대 기준을 적용할 수 있어요. 세대 소득 합산 시 미성년 자녀 소득은 제외하고,
        총자산은 세대원 전원을 포함해요.
      </InformationBanner>
      <Field
        legend={incomeLegend}
        help={size === 1 ? "월 기준 세전 금액을 입력하세요." : "미성년 자녀 소득은 제외한 월 기준 세전 합계예요."}
      >
        <AmountRange
          label={incomeLegend}
          value={incomeValue}
          max={incomeMax}
          step={1}
          marks={[
            { value: 0, label: "0" },
            { value: Math.round(incomeMax / 2), label: `${withThousands(Math.round(incomeMax / 2))}만원` },
            { value: incomeMax, label: `${withThousands(incomeMax)}만원+` },
          ]}
          onChange={(value) =>
            setStepC({
              incomeManwonExact: value,
              incomeBracketIndex: bracketIndexForValue(value, incomeOptions),
            })
          }
        />
      </Field>

      <Field legend={assetLegend} help="부동산 + 자동차 + 금융 + 기타 − 부채 기준이에요.">
        <AmountRange
          label={assetLegend}
          value={assetValue}
          max={50_000}
          step={100}
          marks={[
            { value: 0, label: "0" },
            { value: 25_000, label: "2억 5,000만원" },
            { value: 50_000, label: "5억원+" },
          ]}
          onChange={(value) =>
            setStepC({
              assetManwonExact: value,
              assetBracketIndex: bracketIndexForValue(value, ASSET_BRACKETS),
            })
          }
        />
      </Field>

      <Field legend="세대원이 보유한 차량 중 가장 비싼 차의 가액은?">
        <RadioCards
          name="car"
          columns={3}
          value={carBand}
          onChange={(v) => setStepC({ carBand: v as CarBand })}
          options={carOpts}
        />
      </Field>

      <InfoAccordion summary="왜 소득·자산을 확인하나요?">
        공공임대는 유형별로 소득·자산 상한이 정해져 있어요. 가구원 수에 따라 소득 구간이 달라지기 때문에 가구원을 먼저
        입력한 뒤 소득 구간이 표시돼요.
      </InfoAccordion>
    </div>
  );
}

/** 스텝 D — 지역 */
export function StepD() {
  const { livesInBusan, setLivesInBusan } = useEligibilityStore();
  return (
    <div>
      <Field legend="부산광역시에 거주 중인가요?" help="재개발임대·매입임대 일반은 부산 거주 조건이 적용돼요.">
        <RadioCards
          name="busan"
          columns={2}
          value={boolToVal(livesInBusan)}
          onChange={(v) => setLivesInBusan(v === "yes")}
          options={[
            { value: "yes", label: "예, 거주 중" },
            { value: "no", label: "아니오" },
          ]}
        />
      </Field>
      <InfoAccordion summary="위치 정보를 수집하나요?">
        아니요. 거주 여부만 직접 선택받고, 위치 정보를 자동으로 수집하지 않아요.
      </InfoAccordion>
    </div>
  );
}
