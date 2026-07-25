"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { ASSET_BRACKETS, CAR_OPTIONS, incomeBrackets } from "@/features/eligibility/eligibility.brackets";
import type { CarBand, MemberRelation } from "@/features/eligibility/eligibility.types";
import { RadioCards } from "@/components/ui/selectable";
import { InfoAccordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { calcKoreanAge } from "@/lib/formatting";
import { cn } from "@/lib/utils";
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

const MAX_HOUSEHOLD = 8;

/** 추가 가구원 관계 옵션 (본인·태아 제외). 자격 판정에는 인원수만 사용. */
const ADD_RELATIONS: { value: MemberRelation; label: string }[] = [
  { value: "SPOUSE", label: "배우자" },
  { value: "PARENT", label: "부모" },
  { value: "CHILD", label: "자녀" },
  { value: "SIBLING", label: "형제자매" },
  { value: "OTHER", label: "기타" },
];

/** 스텝 B — 가구·나이 */
export function StepB() {
  const { birthISO, setBirth, members, addMember, removeMember, setMemberRelation } = useEligibilityStore();
  const age = calcKoreanAge(birthISO);

  const total = members.length;
  const atMax = total >= MAX_HOUSEHOLD;
  const rows = members.filter((m) => m.relation !== "FETUS"); // 본인 + 추가 가구원
  const fetus = members.find((m) => m.relation === "FETUS");
  const hasFetus = !!fetus;

  return (
    <div>
      <Field legend="생년월일" help="만 나이는 자동으로 계산돼요.">
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

      <fieldset className="mb-6 last:mb-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <legend className="font-semibold text-fg">가구원 구성</legend>
          <span className="text-sm text-muted">
            함께 거주하는 가구원을 추가해 주세요 · 총 <b className="font-bold text-primary">{total}명</b>
          </span>
        </div>

        <div className="space-y-2">
          {rows.map((m) =>
            m.relation === "SELF" ? (
              <div
                key={m.id}
                className="flex h-12 items-center rounded-[var(--radius-input)] border border-border bg-surface-muted px-4 font-semibold text-fg"
              >
                본인
              </div>
            ) : (
              <div key={m.id} className="flex items-center gap-2">
                <Select
                  value={m.relation}
                  onChange={(e) => setMemberRelation(m.id, e.target.value as MemberRelation)}
                  aria-label="가구원 관계"
                  className="h-12 flex-1"
                >
                  {ADD_RELATIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => removeMember(m.id)}
                  aria-label="가구원 삭제"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-border text-muted transition-colors hover:border-error/40 hover:bg-error-subtle hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => !atMax && addMember("CHILD", "자녀")}
          disabled={atMax}
          className="mt-2 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-[var(--radius-input)] border-2 border-dashed border-border text-sm font-semibold text-primary transition-colors hover:enabled:border-primary/50 hover:enabled:bg-primary-subtle disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {atMax ? `최대 ${MAX_HOUSEHOLD}명까지 추가할 수 있어요` : "가구원 추가"}
        </button>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-border bg-surface px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-fg">태아 포함</p>
            <p className="mt-0.5 text-sm text-muted">임신 중이면 태아도 가구원에 포함돼요.</p>
          </div>
          <Toggle
            checked={hasFetus}
            onChange={() => {
              if (hasFetus && fetus) removeMember(fetus.id);
              else if (!atMax) addMember("FETUS", "태아");
            }}
            label="태아 포함"
          />
        </div>

        <p className="mt-3 text-sm text-muted">
          본인은 기본 포함돼요. 자격 판정에는 인원수만 사용하고, 개인정보는 저장하지 않아요.
        </p>
      </fieldset>
    </div>
  );
}

function bracketIndexForValue(value: number, brackets: Bracket[]): number {
  const index = brackets.findIndex((bracket) => value <= bracket.repManwon);
  return index === -1 ? brackets.length - 1 : index;
}

/** 금액 직접 입력(주 입력) + '금액을 모르면 범위로 선택' 접이식 구간 카드. */
function AmountField({
  ariaLabel,
  placeholder,
  exact,
  brackets,
  bracketIndex,
  columns = 2,
  onExact,
  onBracket,
}: {
  ariaLabel: string;
  placeholder: string;
  exact: number | null;
  brackets: Bracket[];
  bracketIndex: number | null;
  columns?: number;
  onExact: (v: number) => void;
  onBracket: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedRange = exact == null ? bracketIndex : null;
  return (
    <div>
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={exact ?? ""}
          placeholder={placeholder}
          onChange={(event) => onExact(Math.max(0, Number(event.target.value) || 0))}
          aria-label={ariaLabel}
          className="h-14 pr-16 text-lg font-bold tabular-nums"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">만원</span>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2.5 inline-flex items-center gap-1 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        금액을 모르면 범위로 선택
        {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
      </button>
      {open && (
        <div className={cn("mt-3 grid gap-2", columns === 2 && "sm:grid-cols-2")}>
          {brackets.map((b) => {
            const on = selectedRange === b.index;
            return (
              <button
                key={b.index}
                type="button"
                aria-pressed={on}
                onClick={() => onBracket(b.index)}
                className={cn(
                  "min-h-12 rounded-[var(--radius-choice)] border-2 px-3 text-sm font-semibold transition-colors",
                  on ? "border-primary bg-primary-subtle text-primary" : "border-border bg-surface text-fg hover:border-primary/50",
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>
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
  const income100 = incomeOptions[2]?.repManwon ?? 0;
  const carOpts = CAR_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  const incomeLegend = size === 1 ? "본인 월평균 소득이 얼마인가요?" : "세대 월평균 소득이 얼마인가요?";
  const assetLegend = "가구의 총자산이 얼마인가요?";

  return (
    <div>
      <Field
        legend={incomeLegend}
        help={`${size}인 가구 · 도시근로자 월평균소득 100% = ${income100.toLocaleString("ko-KR")}만원`}
      >
        <AmountField
          ariaLabel={incomeLegend}
          placeholder="예: 280"
          exact={incomeManwonExact}
          brackets={incomeOptions}
          bracketIndex={incomeBracketIndex}
          onExact={(value) =>
            setStepC({ incomeManwonExact: value, incomeBracketIndex: bracketIndexForValue(value, incomeOptions) })
          }
          onBracket={(index) => setStepC({ incomeBracketIndex: index, incomeManwonExact: null })}
        />
      </Field>

      <Field legend={assetLegend} help="부동산+자동차+금융+기타 − 부채 로 계산한 금액이에요.">
        <AmountField
          ariaLabel={assetLegend}
          placeholder="예: 15,000"
          exact={assetManwonExact}
          brackets={ASSET_BRACKETS}
          bracketIndex={assetBracketIndex}
          onExact={(value) =>
            setStepC({ assetManwonExact: value, assetBracketIndex: bracketIndexForValue(value, ASSET_BRACKETS) })
          }
          onBracket={(index) => setStepC({ assetBracketIndex: index, assetManwonExact: null })}
        />
      </Field>

      <Field legend="가구가 소유한 차량 상태는?" help="자동차 가액 4,542만원이 기준이에요.">
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
