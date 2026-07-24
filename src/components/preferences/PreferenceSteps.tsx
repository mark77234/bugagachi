"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Baby,
  Blocks,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Hospital,
  School,
  ShoppingCart,
  Train,
  Trees,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCards, RadioCards } from "@/components/ui/selectable";
import { ToggleChip, RemovableChip } from "@/components/ui/chip";
import { InfoAccordion } from "@/components/ui/accordion";
import { InformationBanner } from "@/components/common/banners";
import { AddressSearch } from "./AddressSearch";
import { usePreferencesStore } from "@/features/recommendation/preferences.store";
import { BUSAN_GUNGU } from "@/mocks/regions";
import { formatManwon, withThousands } from "@/lib/formatting";
import { useState } from "react";
import type {
  EduCategory,
  InfraCategory,
  NeighborhoodMood,
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
      <InformationBanner tone="primary">
        예산은 하드필터예요. 기준을 넘는 주택은 추천 목록에서 제외돼요(감점이 아니에요).
      </InformationBanner>

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
        입력한 장소까지의 예상 보정거리(직선거리 × 부산 우회계수 1.291)로 점수를 매겨요.
      </InformationBanner>
      <AddressSearch />
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
        종합병원은 수가 적고 병원급 의료를 차량으로 이용하는 경우가 많아, 도보가 아닌 차량 이동거리 기준으로 점수를 매겨요.
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
  const { storeChips, storeCustom, toggleChip, addCustom, removeCustom } = usePreferencesStore();
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      <InformationBanner tone="primary">
        가까운 한 곳이 아니라, 주변 750m 안에 얼마나 많은지(선택지의 풍부함)를 부산 전체 기준 백분위로 평가해요.
      </InformationBanner>
      <fieldset>
        <Legend>자주 이용하는 가게 (복수 선택)</Legend>
        <div className="flex flex-wrap gap-2">
          {STORE_CHIPS.map((c) => (
            <ToggleChip key={c} label={c} selected={storeChips.includes(c)} onToggle={() => toggleChip(c)} />
          ))}
        </div>
      </fieldset>
      <div>
        <span className="mb-1 block text-sm font-medium text-fg">직접 입력 (상호명·업종)</span>
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예: 서점, ○○커피"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom(text.trim());
                setText("");
              }
            }}
          />
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              addCustom(text.trim());
              setText("");
            }}
          >
            추가
          </Button>
        </div>
        {storeCustom.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {storeCustom.map((c) => (
              <RemovableChip key={c} label={c} onRemove={() => removeCustom(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MOOD_OPTS: { value: NeighborhoodMood; label: string; description: string }[] = [
  { value: "quiet", label: "조용한 동네", description: "상업시설 밀도가 낮고 주거 중심인 환경" },
  { value: "moderate", label: "적당히 생활감 있는 동네", description: "일상 편의시설과 주거지역이 균형을 이루는 환경" },
  { value: "lively", label: "활기차고 번화한 동네", description: "상업시설과 유동인구가 많은 활기찬 환경" },
];

/** Q6 동네 분위기 */
export function NeighborhoodStep() {
  const { mood, setMood } = usePreferencesStore();
  return (
    <fieldset>
      <Legend hint="상권 밀집지와의 거리로 판단해요.">선호하는 동네 분위기</Legend>
      <RadioCards<NeighborhoodMood>
        name="mood"
        columns={1}
        value={mood}
        onChange={setMood}
        options={MOOD_OPTS}
      />
    </fieldset>
  );
}
