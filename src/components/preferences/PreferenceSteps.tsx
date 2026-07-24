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
import type { CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCards, RadioCards } from "@/components/ui/selectable";
import { ToggleChip } from "@/components/ui/chip";
import { InfoAccordion } from "@/components/ui/accordion";
import { InformationBanner } from "@/components/common/banners";
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

/** Q0 예산 */
export function BudgetStep() {
  const { maxDeposit, maxMonthlyRent, setBudget } = usePreferencesStore();
  const depositQuick = [1000, 3000, 5000];
  const rentQuick = [15, 25, 35];
  return (
    <div className="space-y-6">
      <fieldset>
        <Legend hint="만원 단위로 입력하세요.">보증금 최대 금액</Legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            className="max-w-[220px]"
            value={maxDeposit ?? ""}
            onChange={(e) => setBudget({ maxDeposit: e.target.value === "" ? 0 : Number(e.target.value) })}
            aria-label="보증금 최대 금액(만원)"
          />
          <span className="text-muted">만원</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {depositQuick.map((v) => (
            <Button key={v} variant="outline" size="sm" onClick={() => setBudget({ maxDeposit: v })}>
              {formatManwon(v)}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <Legend hint="만원 단위로 입력하세요.">월 임대료 최대 금액</Legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            className="max-w-[220px]"
            value={maxMonthlyRent ?? ""}
            onChange={(e) => setBudget({ maxMonthlyRent: e.target.value === "" ? 0 : Number(e.target.value) })}
            aria-label="월 임대료 최대 금액(만원)"
          />
          <span className="text-muted">만원</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {rentQuick.map((v) => (
            <Button key={v} variant="outline" size="sm" onClick={() => setBudget({ maxMonthlyRent: v })}>
              {formatManwon(v)}
            </Button>
          ))}
        </div>
      </fieldset>

      {(maxDeposit !== null || maxMonthlyRent !== null) && (
        <p className="rounded-[var(--radius-input)] bg-surface-muted p-3 text-sm text-fg">
          현재 예산: 보증금 <b>{maxDeposit !== null ? withThousands(maxDeposit) + "만원" : "—"}</b> · 월{" "}
          <b>{maxMonthlyRent !== null ? withThousands(maxMonthlyRent) + "만원" : "—"}</b> 이하
        </p>
      )}
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
      <InformationBanner tone="primary">
        주소를 EPSG:5186 좌표로 바꾼 뒤 직선거리 × 1.291로 예상 이동거리를 계산해요.
      </InformationBanner>
      <AddressSearch />
      <InfoAccordion summary="거리 점수는 어떻게 계산하나요?">
        5km 이하는 1점, 10km는 0.7점, 30km 이상은 0점으로 두고 그 사이는 선형으로 낮아져요. 여러
        장소를 넣으면 장소별 점수를 같은 비중으로 평균해요.
      </InfoAccordion>
    </div>
  );
}

const INFRA_OPTS: { value: InfraCategory; label: string; icon: LucideIcon }[] = [
  { value: "HOSPITAL", label: "종합병원", icon: Hospital },
  { value: "MART", label: "대형마트", icon: ShoppingCart },
  { value: "PARK", label: "공원", icon: Trees },
  { value: "LIBRARY", label: "도서관", icon: BookOpen },
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
      <InfoAccordion summary="종합병원은 왜 기준이 다른가요?">
        병원과 도서관은 거점형 시설이라 5·10·15·20km 차량 기준을, 대형마트·공원·생활체육시설·지하철역은
        750m·1.5km·3km·6km 도보 기준을 사용해요. 각 구간 사이는 점수가 선형으로 낮아집니다.
      </InfoAccordion>
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
      <InfoAccordion summary="돌봄·교육 점수는 어떻게 계산하나요?">
        어린이집은 375m·750m·1.5km·3km, 유치원과 초·중·고는 750m·1.5km·3km·6km를
        기준으로 점수를 낮춰요. 여러 시설을 고르면 같은 비중으로 평균합니다.
      </InfoAccordion>
    </div>
  );
}

const STORE_CHIPS = [
  "카페",
  "편의점",
  "헬스장",
  "빨래방",
  "동물병원",
  "스터디카페",
  "밥집",
  "베이커리",
  "미용실",
  "약국",
];

/** Q5 취향 가게 */
export function StoreStep() {
  const { storeChips, toggleChip } = usePreferencesStore();
  const limitReached = storeChips.length >= 5;
  return (
    <div className="space-y-4">
      <InformationBanner tone="primary">
        건물 반경 750m 안의 업종별 점포 수를 전체 주택 건물과 비교해 백분위로 바꾸고, 선택한 업종을 같은 비중으로
        평균해요.
      </InformationBanner>
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
      <InfoAccordion summary="분위기 점수는 어떻게 계산하나요?">
        반경 750m의 전체 상가 수 백분위가 선택한 위치와 가까울수록 점수가 높아요. 조용한 쪽을 선택할수록 노래방·주점
        같은 소음 업종 구성비에 최대 50% 감점을 적용하고, 번화한 쪽으로 갈수록 감점은 줄어듭니다.
      </InfoAccordion>
    </div>
  );
}
