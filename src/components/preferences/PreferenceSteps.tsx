"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Baby,
  Building2,
  Blocks,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Hospital,
  House,
  Moon,
  School,
  ShoppingCart,
  Train,
  Trees,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { CheckCards, RadioCards } from "@/components/ui/selectable";
import { ToggleChip } from "@/components/ui/chip";
import { AddressSearch } from "./AddressSearch";
import { usePreferencesStore } from "@/features/recommendation/preferences.store";
import { BUSAN_GUNGU } from "@/mocks/regions";
import { formatManwon, withThousands } from "@/lib/formatting";
import type {
  EduCategory,
  InfraCategory,
} from "@/features/recommendation/recommendation.types";

function Legend({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <>
      <legend className="mb-1 font-semibold text-fg">{children}</legend>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
    </>
  );
}

/** Q0 예산 — 슬라이더 범위(만원). 재고 상한(보증금 4,553 · 월 32.3)보다 넉넉하게 잡아
 *  보증금이 큰 조건까지 상한으로 지정할 수 있게 한다. */
const DEPOSIT_SLIDER = { min: 0, max: 10000, step: 50, fallback: 1000 };
const RENT_SLIDER = { min: 0, max: 70, step: 1, fallback: 25 };

function AmountSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  quick,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  quick: number[];
  onChange: (v: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <fieldset>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <legend className="font-semibold text-fg">{label}</legend>
        <output className="rounded-full bg-primary-subtle px-3 py-1 text-sm font-bold tabular-nums text-primary">
          {withThousands(value)}만원 이하
        </output>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label}(만원)`}
        aria-valuetext={`${withThousands(value)}만원`}
        className="preference-range w-full"
        style={{ "--range-progress": `${progress}%` } as CSSProperties}
      />
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{withThousands(min)}만원</span>
        <span>{withThousands(max)}만원</span>
      </div>
      <p className="mt-2 text-sm text-muted">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((v) => (
          <Button key={v} variant="outline" size="sm" onClick={() => onChange(v)}>
            {formatManwon(v)}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

/** Q0 예산 */
export function BudgetStep() {
  const { maxDeposit, maxMonthlyRent, setBudget } = usePreferencesStore();
  const deposit = maxDeposit ?? DEPOSIT_SLIDER.fallback;
  const rent = maxMonthlyRent ?? RENT_SLIDER.fallback;

  // 슬라이더는 '미입력' 상태를 표현할 수 없으므로 진입 시 기본값을 확정한다.
  useEffect(() => {
    if (maxDeposit === null || maxMonthlyRent === null) {
      setBudget({ maxDeposit: deposit, maxMonthlyRent: rent });
    }
  }, [maxDeposit, maxMonthlyRent, deposit, rent, setBudget]);

  return (
    <div className="space-y-7">
      <AmountSlider
        label="보증금 최대 금액"
        hint="슬라이더를 움직여 보증금 상한을 정하면 예산 밖 주택을 제외해요."
        value={deposit}
        min={DEPOSIT_SLIDER.min}
        max={DEPOSIT_SLIDER.max}
        step={DEPOSIT_SLIDER.step}
        quick={[1000, 3000, 5000, 10000]}
        onChange={(v) => setBudget({ maxDeposit: v })}
      />

      <AmountSlider
        label="월 임대료 최대 금액"
        hint="슬라이더를 움직여 월 임대료 상한을 정하면 예산 밖 주택을 제외해요."
        value={rent}
        min={RENT_SLIDER.min}
        max={RENT_SLIDER.max}
        step={RENT_SLIDER.step}
        quick={[15, 25, 35, 70]}
        onChange={(v) => setBudget({ maxMonthlyRent: v })}
      />

      <p className="rounded-[var(--radius-input)] bg-surface-muted p-3 text-sm text-fg">
        현재 예산: 보증금 <b>{withThousands(deposit)}만원</b> · 월 <b>{withThousands(rent)}만원</b> 이하
      </p>
    </div>
  );
}

/** Q1 희망 지역 */
export function RegionStep() {
  const { gungus, anyRegion, toggleGungu, setAnyRegion } = usePreferencesStore();
  return (
    <div className="space-y-4">
      <ToggleChip label="상관없어요 (전체)" selected={anyRegion} onToggle={() => setAnyRegion(!anyRegion)} />
      <fieldset>
        <Legend hint="원하는 구·군을 복수로 선택할 수 있어요.">부산 구·군</Legend>
        <div className="flex flex-wrap gap-2">
          {BUSAN_GUNGU.map((g) => (
            <ToggleChip
              key={g.code}
              label={g.name}
              selected={!anyRegion && gungus.includes(g.name)}
              onToggle={() => toggleGungu(g.name)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Q2 자주 가는 장소 */
export function FrequentStep() {
  return (
    <div className="space-y-4">
      <AddressSearch />
    </div>
  );
}

const INFRA_OPTS: { value: InfraCategory; label: string; icon: LucideIcon }[] = [
  { value: "HOSPITAL", label: "종합병원", icon: Hospital },
  { value: "MART", label: "대형마트", icon: ShoppingCart },
  { value: "PARK", label: "공원", icon: Trees },
  { value: "LIBRARY", label: "공공도서관", icon: BookOpen },
  { value: "SPORTS", label: "생활체육시설", icon: Dumbbell },
  { value: "SUBWAY", label: "지하철역", icon: Train },
];

/** Q3 기반시설 */
export function InfraStep() {
  const { infraCategories, toggleInfra } = usePreferencesStore();
  return (
    <div className="space-y-4">
      <fieldset>
        <Legend hint="선택한 시설만 추천 점수에 반영돼요. (복수 선택)">필요한 기반시설</Legend>
        <CheckCards<InfraCategory> values={infraCategories} onToggle={toggleInfra} options={INFRA_OPTS} columns={2} />
      </fieldset>
    </div>
  );
}

const EDU_OPTS: { value: EduCategory; label: string; icon: LucideIcon }[] = [
  { value: "DAYCARE", label: "어린이집", icon: Baby },
  { value: "KINDER", label: "유치원", icon: Blocks },
  { value: "ELEM", label: "초등학교", icon: School },
  { value: "MIDDLE", label: "중학교", icon: School },
  { value: "HIGH", label: "고등학교", icon: GraduationCap },
];

/** Q4 돌봄·교육 */
export function EducationStep() {
  const { eduEnabled, eduCategories, setEduEnabled, toggleEdu } = usePreferencesStore();
  return (
    <div className="space-y-5">
      <fieldset>
        <Legend hint="필요하지 않으면 이 항목은 추천 점수에서 제외돼요.">돌봄·교육 시설이 필요한가요?</Legend>
        <RadioCards
          name="edu-enabled"
          columns={2}
          value={eduEnabled === null ? null : eduEnabled ? "yes" : "no"}
          onChange={(v) => setEduEnabled(v === "yes")}
          options={[
            { value: "yes", label: "필요해요" },
            { value: "no", label: "필요 없어요" },
          ]}
        />
      </fieldset>
      <AnimatePresence initial={false}>
        {eduEnabled && (
          <motion.fieldset
            key="edu-cats"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Legend hint="자녀 개인정보는 묻지 않아요. 필요한 시설만 선택하세요.">필요한 시설</Legend>
            <CheckCards<EduCategory> values={eduCategories} onToggle={toggleEdu} options={EDU_OPTS} columns={2} />
          </motion.fieldset>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Q5 취향 가게 칩. 값은 점수 데이터(unit.source.stores) 키와 1:1로 맞춘다. */
const STORE_CHIPS = [
  "식당",
  "뷰티",
  "카페",
  "편의점/슈퍼마켓",
  "운동/스포츠",
  "베이커리",
  "치킨",
  "주점",
  "입시/예체능 학원",
  "독서실/스터디카페",
];

/** Q5 취향 가게 */
export function StoreStep() {
  const { storeChips, toggleChip } = usePreferencesStore();
  const limitReached = storeChips.length >= 5;
  return (
    <div className="space-y-4">
      <fieldset>
        <Legend hint={`최대 5개까지 선택할 수 있어요. (${storeChips.length}/5)`}>
          자주 이용하는 가게
        </Legend>
        <div className="flex flex-wrap gap-2">
          {STORE_CHIPS.map((c) => (
            <ToggleChip
              key={c}
              label={c}
              selected={storeChips.includes(c)}
              disabled={limitReached && !storeChips.includes(c)}
              onToggle={() => toggleChip(c)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Q6 동네 분위기 */
export function NeighborhoodStep() {
  const { moodTarget, setMoodTarget } = usePreferencesStore();
  const target = moodTarget ?? 0.5;
  const label =
    target < 0.35 ? "조용한 쪽" : target > 0.65 ? "번화한 쪽" : "적당한 생활감";
  return (
    <div className="space-y-5">
      <fieldset>
        <Legend hint="상가 밀도와 소음 업종 비율을 함께 반영해요.">
          선호하는 동네 분위기
        </Legend>
        <ToggleChip
          label="상관없어요"
          selected={moodTarget === null}
          onToggle={() => setMoodTarget(moodTarget === null ? 0.5 : null)}
        />
        <div
          className="mt-5 rounded-[var(--radius-card)] border border-border bg-surface-muted/60 p-5"
          aria-disabled={moodTarget === null}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-navy">현재 선택</span>
            <output className="rounded-full bg-primary-subtle px-3 py-1 text-sm font-bold text-primary">
              {moodTarget === null ? "추천에 반영하지 않음" : `${label} · ${Math.round(target * 100)}`}
            </output>
          </div>
          <input
            id="neighborhood-mood"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(target * 100)}
            disabled={moodTarget === null}
            onChange={(event) => setMoodTarget(Number(event.target.value) / 100)}
            aria-label="동네 분위기 선호도, 조용함에서 번화함까지"
            className="preference-range w-full"
            style={{ "--range-progress": `${target * 100}%` } as CSSProperties}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <span className="flex flex-col items-center gap-1 text-muted">
              <Moon className="h-5 w-5" aria-hidden /> 조용
            </span>
            <span className="flex flex-col items-center gap-1 text-muted">
              <House className="h-5 w-5" aria-hidden /> 적당
            </span>
            <span className="flex flex-col items-center gap-1 text-muted">
              <Building2 className="h-5 w-5" aria-hidden /> 번화
            </span>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
