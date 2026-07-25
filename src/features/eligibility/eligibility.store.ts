"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/storage";
import { calcKoreanAge } from "@/lib/formatting";
import { ASSET_BRACKETS, incomeBrackets } from "./eligibility.brackets";
import type {
  CarBand,
  EligibilityCommonInput,
  EligibilityDetailInput,
  EligibilityTypeResult,
  HouseholdMember,
} from "./eligibility.types";

/** 세대구성원 상한(본인 포함). 소득·자산 기준표가 8인까지만 정의된다. */
export const MAX_HOUSEHOLD = 8;

/** 본인 질문(청년 판정용)을 노출하는 나이 구간. */
export const YOUTH_AGE_RANGE: [number, number] = [19, 39];

interface EligibilityState {
  hydrated: boolean;
  // 스텝 A
  ownSelfHouse: boolean | null;
  ownMemberHouse: boolean | null;
  hasRestriction: boolean | null;
  // 스텝 B — 본인은 항상 1명. 나머지는 관계별 인원수.
  birthISO: string;
  hasSpouse: boolean | null;
  parentCount: number;
  childCount: number;
  fetusCount: number;
  // 스텝 C — 세대 전원 합계
  incomeBracketIndex: number | null;
  assetBracketIndex: number | null;
  incomeManwonExact: number | null;
  assetManwonExact: number | null;
  // 스텝 C — 본인 단독(청년 판정용)
  selfIncomeBracketIndex: number | null;
  selfAssetBracketIndex: number | null;
  selfIncomeManwonExact: number | null;
  selfAssetManwonExact: number | null;
  carBand: CarBand | null;
  // 스텝 D
  livesInBusan: boolean | null;
  // 1-2
  detail: EligibilityDetailInput;
  // 저장된 결과 스냅샷 (마이페이지)
  savedResults: EligibilityTypeResult[] | null;

  // actions
  setStepA: (v: Partial<Pick<EligibilityState, "ownSelfHouse" | "ownMemberHouse" | "hasRestriction">>) => void;
  setBirth: (iso: string) => void;
  setStepB: (
    v: Partial<Pick<EligibilityState, "hasSpouse" | "parentCount" | "childCount" | "fetusCount">>,
  ) => void;
  setStepC: (
    v: Partial<
      Pick<
        EligibilityState,
        | "incomeBracketIndex"
        | "assetBracketIndex"
        | "incomeManwonExact"
        | "assetManwonExact"
        | "selfIncomeBracketIndex"
        | "selfAssetBracketIndex"
        | "selfIncomeManwonExact"
        | "selfAssetManwonExact"
        | "carBand"
      >
    >,
  ) => void;
  setLivesInBusan: (v: boolean) => void;
  setDetail: (detail: EligibilityDetailInput) => void;
  saveResults: (r: EligibilityTypeResult[]) => void;
  invalidateDetail: () => void; // 1-1 변경 시 1-2 무효화
  reset: () => void;
}

const initial = {
  ownSelfHouse: null,
  ownMemberHouse: null,
  hasRestriction: null,
  birthISO: "",
  hasSpouse: null,
  parentCount: 0,
  childCount: 0,
  fetusCount: 0,
  incomeBracketIndex: null,
  assetBracketIndex: null,
  incomeManwonExact: null,
  assetManwonExact: null,
  selfIncomeBracketIndex: null,
  selfAssetBracketIndex: null,
  selfIncomeManwonExact: null,
  selfAssetManwonExact: null,
  carBand: null,
  livesInBusan: null,
  detail: {} as EligibilityDetailInput,
  savedResults: null,
};

export const useEligibilityStore = create<EligibilityState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...initial,
      setStepA: (v) => set((s) => ({ ...s, ...v })),
      setBirth: (iso) => set({ birthISO: iso }),
      setStepB: (v) => set((s) => ({ ...s, ...v })),
      setStepC: (v) => set((s) => ({ ...s, ...v })),
      setLivesInBusan: (v) => set({ livesInBusan: v }),
      setDetail: (detail) => set({ detail }),
      saveResults: (r) => set({ savedResults: r }),
      invalidateDetail: () => set({ detail: {}, savedResults: null }),
      reset: () => set({ ...initial }),
    }),
    {
      name: STORAGE_KEYS.eligibility,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const value = { ...((persisted ?? {}) as Record<string, unknown>) };
        // v1: members[] 목록 → 관계별 인원수. 관계 정보가 없던 행은 자녀로 접는다.
        if (version < 1) {
          const members = Array.isArray(value.members)
            ? (value.members as { relation?: string }[])
            : [];
          value.hasSpouse = members.some((m) => m.relation === "SPOUSE");
          value.parentCount = members.filter((m) => m.relation === "PARENT").length;
          value.childCount = members.filter(
            (m) => m.relation === "CHILD" || m.relation === "SIBLING" || m.relation === "OTHER",
          ).length;
          value.fetusCount = members.filter((m) => m.relation === "FETUS").length;
          delete value.members;
        }
        return value as unknown as EligibilityState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: ({ hydrated: _h, ...rest }) => rest,
    },
  ),
);

/** 본인 포함 세대구성원 수(태아 포함, 1~8). */
export function householdSizeOf(s: EligibilityState): number {
  const total = 1 + (s.hasSpouse ? 1 : 0) + s.parentCount + s.childCount + s.fetusCount;
  return Math.min(Math.max(total, 1), MAX_HOUSEHOLD);
}

/** 스텝 B 입력을 판정용 가구원 목록으로 펼친다(판정에는 인원수만 쓰인다). */
export function membersOf(s: EligibilityState): HouseholdMember[] {
  const members: HouseholdMember[] = [{ id: "self", relation: "SELF" }];
  if (s.hasSpouse) members.push({ id: "spouse", relation: "SPOUSE" });
  for (let i = 0; i < s.parentCount; i += 1) members.push({ id: `parent-${i}`, relation: "PARENT" });
  for (let i = 0; i < s.childCount; i += 1) members.push({ id: `child-${i}`, relation: "CHILD" });
  for (let i = 0; i < s.fetusCount; i += 1) members.push({ id: `fetus-${i}`, relation: "FETUS" });
  return members;
}

/** 만 19~39세면 청년 유형 판정을 위해 '본인' 소득·자산을 따로 받는다. */
export function isYouthAge(birthISO: string): boolean {
  const age = calcKoreanAge(birthISO);
  return age !== null && age >= YOUTH_AGE_RANGE[0] && age <= YOUTH_AGE_RANGE[1];
}

/** 스텝 C에서 '본인' 질문을 노출할지. 세대 1인이면 본인 질문이 곧 세대 질문이다. */
export function needsSelfAmounts(s: EligibilityState): boolean {
  return householdSizeOf(s) === 1 || isYouthAge(s.birthISO);
}

/** 스텝 C에서 '세대 합계' 질문을 노출할지. 세대 1인이면 생략한다. */
export function needsHouseholdAmounts(s: EligibilityState): boolean {
  return householdSizeOf(s) >= 2;
}

const hasAmount = (exact: number | null, bracket: number | null) => exact !== null || bracket !== null;

/** 스텝 C 완료 여부. 노출된 질문만 요구한다. */
export function isStepCComplete(s: EligibilityState): boolean {
  if (s.carBand === null) return false;
  if (
    needsSelfAmounts(s) &&
    !(
      hasAmount(s.selfIncomeManwonExact, s.selfIncomeBracketIndex) &&
      hasAmount(s.selfAssetManwonExact, s.selfAssetBracketIndex)
    )
  ) {
    return false;
  }
  if (
    needsHouseholdAmounts(s) &&
    !(
      hasAmount(s.incomeManwonExact, s.incomeBracketIndex) &&
      hasAmount(s.assetManwonExact, s.assetBracketIndex)
    )
  ) {
    return false;
  }
  return true;
}

/** 스텝 완료 여부. */
export function isCommonComplete(s: EligibilityState): boolean {
  return (
    s.ownSelfHouse !== null &&
    s.ownMemberHouse !== null &&
    s.hasRestriction !== null &&
    s.birthISO !== "" &&
    isStepCComplete(s) &&
    s.livesInBusan !== null
  );
}

function amountOf(exact: number | null, bracketIndex: number | null, brackets: { repManwon: number }[]): number {
  if (exact !== null) return exact;
  if (bracketIndex !== null) return brackets[bracketIndex]?.repManwon ?? 0;
  return 0;
}

/** store 값 → 판정용 EligibilityCommonInput (미완료면 null). */
export function buildCommonInput(s: EligibilityState): EligibilityCommonInput | null {
  if (!isCommonComplete(s)) return null;
  const householdSize = householdSizeOf(s);

  // 본인 소득·자산은 1인 가구 구간으로 받는다(청년 유형 심사 기준).
  const selfIncome = amountOf(s.selfIncomeManwonExact, s.selfIncomeBracketIndex, incomeBrackets(1));
  const selfAsset = amountOf(s.selfAssetManwonExact, s.selfAssetBracketIndex, ASSET_BRACKETS);

  // 세대 1인이면 본인 값이 곧 세대 값이다.
  const income =
    householdSize === 1
      ? selfIncome
      : amountOf(s.incomeManwonExact, s.incomeBracketIndex, incomeBrackets(householdSize));
  const asset =
    householdSize === 1 ? selfAsset : amountOf(s.assetManwonExact, s.assetBracketIndex, ASSET_BRACKETS);

  return {
    ownSelfHouse: s.ownSelfHouse!,
    ownMemberHouse: s.ownMemberHouse!,
    hasRestriction: s.hasRestriction!,
    birthISO: s.birthISO,
    ageYears: calcKoreanAge(s.birthISO) ?? 0,
    members: membersOf(s),
    householdSize,
    incomeManwon: income,
    assetManwon: asset,
    // 본인 질문을 받지 않은 경우(2인 이상 + 청년 아님)에는 세대 값으로 대체한다.
    selfIncomeManwon: needsSelfAmounts(s) ? selfIncome : income,
    selfAssetManwon: needsSelfAmounts(s) ? selfAsset : asset,
    carBand: s.carBand!,
    livesInBusan: s.livesInBusan!,
  };
}
