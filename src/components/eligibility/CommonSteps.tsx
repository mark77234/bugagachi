"use client";

import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { useState } from "react";
import {
  MAX_HOUSEHOLD,
  householdSizeOf,
  needsHouseholdAmounts,
  needsSelfAmounts,
  useEligibilityStore,
} from "@/features/eligibility/eligibility.store";
import { ASSET_BRACKETS, CAR_OPTIONS, incomeBrackets } from "@/features/eligibility/eligibility.brackets";
import type { CarBand } from "@/features/eligibility/eligibility.types";
import { RadioCards } from "@/components/ui/selectable";
import { InfoAccordion } from "@/components/ui/accordion";
import { InformationBanner } from "@/components/common/banners";
import { Input } from "@/components/ui/input";
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

/** 관계별 인원수 스테퍼. 본인은 디폴트 1명으로 고정되어 여기에 나오지 않는다. */
function CountRow({
  label,
  help,
  value,
  max,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-fg">{label}</p>
        <p className="mt-0.5 text-sm text-muted">{help}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label={`${label} 1명 줄이기`}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border border-border text-fg transition-colors hover:enabled:border-primary/50 hover:enabled:bg-primary-subtle disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <output className="w-10 text-center font-bold tabular-nums text-fg" aria-label={`${label} ${value}명`}>
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label} 1명 늘리기`}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border border-border text-fg transition-colors hover:enabled:border-primary/50 hover:enabled:bg-primary-subtle disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** 스텝 B — 생년월일 · 주민등록상 세대구성원 */
export function StepB() {
  const store = useEligibilityStore();
  const { birthISO, setBirth, hasSpouse, parentCount, childCount, fetusCount, setStepB } = store;
  const age = calcKoreanAge(birthISO);
  const total = householdSizeOf(store);
  const remaining = MAX_HOUSEHOLD - total;

  return (
    <div>
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

      <fieldset className="mb-6 last:mb-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <legend className="font-semibold text-fg">주민등록상 세대구성원을 관계별로 알려주세요</legend>
          <span className="text-sm text-muted">
            총 <b className="font-bold text-primary">{total}명</b> (태아 포함)
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-border bg-surface-muted px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-fg">본인</p>
              <p className="mt-0.5 text-sm text-muted">항상 세대구성원에 포함돼요.</p>
            </div>
            <span className="shrink-0 rounded-full bg-primary-subtle px-3 py-1 text-sm font-bold text-primary">
              1명
            </span>
          </div>

          <div className="rounded-[var(--radius-input)] border border-border bg-surface px-4 py-3">
            <p className="font-semibold text-fg">배우자</p>
            <p className="mt-0.5 mb-3 text-sm text-muted">따로 살아도 세대구성원에 포함돼요.</p>
            <RadioCards
              name="spouse"
              columns={2}
              value={boolToVal(hasSpouse)}
              onChange={(v) => setStepB({ hasSpouse: v === "yes" })}
              options={YESNO("있음", "없음")}
            />
          </div>

          <CountRow
            label="부모·조부모"
            help="주민등록표에 함께 오른 분만 세어 주세요."
            value={parentCount}
            max={parentCount + Math.max(remaining, 0)}
            onChange={(v) => setStepB({ parentCount: v })}
          />
          <CountRow
            label="자녀"
            help="미성년 자녀도 모두 포함해요."
            value={childCount}
            max={childCount + Math.max(remaining, 0)}
            onChange={(v) => setStepB({ childCount: v })}
          />
          <CountRow
            label="임신 중 태아"
            help="임신 중이면 태아도 세대구성원으로 세요."
            value={fetusCount}
            max={fetusCount + Math.max(remaining, 0)}
            onChange={(v) => setStepB({ fetusCount: v })}
          />
        </div>

        {remaining <= 0 && (
          <p className="mt-3 text-sm text-muted">최대 {MAX_HOUSEHOLD}명까지 입력할 수 있어요.</p>
        )}
      </fieldset>

      <InformationBanner tone="primary" title="세대구성원이란?">
        <p>
          주민등록표에 함께 오른 본인 · 배우자 · 부모(조부모) · 자녀예요. 배우자는 따로 살아도 포함돼요.
        </p>
        <p className="mt-2">
          <b className="text-fg">형제자매, 삼촌, 조카 등은 세대구성원이 아니라 빼고 입력</b>해 주세요.
        </p>
        <p className="mt-2">입력한 관계로 세대원 수(태아 포함)가 자동 계산돼 소득·자산 기준에 쓰여요.</p>
      </InformationBanner>
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

/** 스텝 C — 소득·자산.
 *  본인 질문은 세대 1인이거나 만 19~39세일 때만, 세대 합계 질문은 2인 이상일 때만 노출한다. */
export function StepC() {
  const store = useEligibilityStore();
  const {
    incomeBracketIndex,
    assetBracketIndex,
    incomeManwonExact,
    assetManwonExact,
    selfIncomeBracketIndex,
    selfAssetBracketIndex,
    selfIncomeManwonExact,
    selfAssetManwonExact,
    carBand,
    setStepC,
  } = store;

  const size = householdSizeOf(store);
  const showSelf = needsSelfAmounts(store);
  const showHousehold = needsHouseholdAmounts(store);

  // 본인 소득은 1인 가구 구간, 세대 소득은 세대원 수 구간을 쓴다.
  const selfIncomeOptions = incomeBrackets(1);
  const householdIncomeOptions = incomeBrackets(size);
  const carOpts = CAR_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

  const selfIncomeLegend = "본인의 월평균 소득(세전)은?";
  const selfAssetLegend = "본인이 보유한 총자산은? (부동산+자동차+금융+기타−부채)";
  const householdIncomeLegend = "세대구성원 전원의 월소득 합계는?";
  const householdAssetLegend = "세대구성원 전원의 총자산 합계는?";

  return (
    <div>
      {showSelf && (
        <>
          <Field
            legend={selfIncomeLegend}
            help={`1인 가구 기준 · 도시근로자 월평균소득 100% = ${(selfIncomeOptions[2]?.repManwon ?? 0).toLocaleString("ko-KR")}만원`}
          >
            <AmountField
              ariaLabel={selfIncomeLegend}
              placeholder="예: 280"
              exact={selfIncomeManwonExact}
              brackets={selfIncomeOptions}
              bracketIndex={selfIncomeBracketIndex}
              onExact={(value) =>
                setStepC({
                  selfIncomeManwonExact: value,
                  selfIncomeBracketIndex: bracketIndexForValue(value, selfIncomeOptions),
                })
              }
              onBracket={(index) => setStepC({ selfIncomeBracketIndex: index, selfIncomeManwonExact: null })}
            />
          </Field>

          <Field legend={selfAssetLegend} help="본인 명의 자산에서 부채를 뺀 금액이에요.">
            <AmountField
              ariaLabel={selfAssetLegend}
              placeholder="예: 15,000"
              exact={selfAssetManwonExact}
              brackets={ASSET_BRACKETS}
              bracketIndex={selfAssetBracketIndex}
              onExact={(value) =>
                setStepC({
                  selfAssetManwonExact: value,
                  selfAssetBracketIndex: bracketIndexForValue(value, ASSET_BRACKETS),
                })
              }
              onBracket={(index) => setStepC({ selfAssetBracketIndex: index, selfAssetManwonExact: null })}
            />
          </Field>
        </>
      )}

      {showHousehold && (
        <>
          <Field
            legend={householdIncomeLegend}
            help={`${size}인 가구 · 도시근로자 월평균소득 100% = ${(householdIncomeOptions[2]?.repManwon ?? 0).toLocaleString("ko-KR")}만원`}
          >
            <AmountField
              ariaLabel={householdIncomeLegend}
              placeholder="예: 420"
              exact={incomeManwonExact}
              brackets={householdIncomeOptions}
              bracketIndex={incomeBracketIndex}
              onExact={(value) =>
                setStepC({
                  incomeManwonExact: value,
                  incomeBracketIndex: bracketIndexForValue(value, householdIncomeOptions),
                })
              }
              onBracket={(index) => setStepC({ incomeBracketIndex: index, incomeManwonExact: null })}
            />
          </Field>

          <Field
            legend={householdAssetLegend}
            help="부동산+자동차+금융+기타 − 부채 로 계산한 세대 전원의 합계예요."
          >
            <AmountField
              ariaLabel={householdAssetLegend}
              placeholder="예: 25,000"
              exact={assetManwonExact}
              brackets={ASSET_BRACKETS}
              bracketIndex={assetBracketIndex}
              onExact={(value) =>
                setStepC({
                  assetManwonExact: value,
                  assetBracketIndex: bracketIndexForValue(value, ASSET_BRACKETS),
                })
              }
              onBracket={(index) => setStepC({ assetBracketIndex: index, assetManwonExact: null })}
            />
          </Field>
        </>
      )}

      <Field
        legend="세대구성원이 보유한 차량 중 가장 비싼 차의 가액은?"
        help="자동차 가액 4,542만원이 기준이에요."
      >
        <RadioCards
          name="car"
          columns={3}
          value={carBand}
          onChange={(v) => setStepC({ carBand: v as CarBand })}
          options={carOpts}
        />
      </Field>

      <InformationBanner tone="primary" title="소득·자산은 '본인'과 '세대 전원'을 따로 받아요.">
        <p>유형마다 심사 기준이 달라서예요. 청년 유형은 &lsquo;본인&rsquo;만, 그 외는 &lsquo;세대 전원&rsquo;을 봐요.</p>
        <p className="mt-2">
          본인 질문은 <b className="text-fg">만 19~39세</b>일 때만 떠요. 세대구성원이 본인 한 명이면 세대 합계 질문은
          건너뜁니다.
        </p>
        <p className="mt-3 font-semibold text-fg">합계 넣을 때</p>
        <ul className="mt-1 space-y-1">
          <li>· 소득·자산 모두 <b className="text-fg">세대구성원 전원(본인·미성년 자녀 포함)</b>을 더해 주세요.</li>
          <li>· 소득 = 세전 월평균, 자산 = 부동산+자동차+금융+기타−부채</li>
          <li>
            · <b className="text-fg">자동차 질문</b>은 가장 비싼 차 1대 기준이고, <b className="text-fg">총자산 합계</b>엔
            세대가 보유한 모든 차를 포함해요.
          </li>
        </ul>
      </InformationBanner>
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
