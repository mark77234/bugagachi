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
  MemberRelation,
} from "./eligibility.types";

interface EligibilityState {
  hydrated: boolean;
  // 스텝 A
  ownSelfHouse: boolean | null;
  ownMemberHouse: boolean | null;
  hasRestriction: boolean | null;
  // 스텝 B
  birthISO: string;
  members: HouseholdMember[];
  // 스텝 C
  incomeBracketIndex: number | null;
  assetBracketIndex: number | null;
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
  addMember: (relation: MemberRelation) => void;
  removeMember: (id: string) => void;
  setStepC: (v: Partial<Pick<EligibilityState, "incomeBracketIndex" | "assetBracketIndex" | "carBand">>) => void;
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
  members: [{ id: "self", relation: "SELF" as MemberRelation }],
  incomeBracketIndex: null,
  assetBracketIndex: null,
  carBand: null,
  livesInBusan: null,
  detail: {} as EligibilityDetailInput,
  savedResults: null,
};

let memberSeq = 0;

export const useEligibilityStore = create<EligibilityState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...initial,
      setStepA: (v) => set((s) => ({ ...s, ...v })),
      setBirth: (iso) => set({ birthISO: iso }),
      addMember: (relation) =>
        set((s) => ({ members: [...s.members, { id: `m${++memberSeq}-${s.members.length}`, relation }] })),
      removeMember: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id || m.relation === "SELF") })),
      setStepC: (v) => set((s) => ({ ...s, ...v })),
      setLivesInBusan: (v) => set({ livesInBusan: v }),
      setDetail: (detail) => set({ detail }),
      saveResults: (r) => set({ savedResults: r }),
      invalidateDetail: () => set({ detail: {}, savedResults: null }),
      reset: () => set({ ...initial }),
    }),
    {
      name: STORAGE_KEYS.eligibility,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: ({ hydrated: _h, ...rest }) => rest,
    },
  ),
);

/** 스텝 완료 여부. */
export function isCommonComplete(s: EligibilityState): boolean {
  return (
    s.ownSelfHouse !== null &&
    s.ownMemberHouse !== null &&
    s.hasRestriction !== null &&
    s.birthISO !== "" &&
    s.incomeBracketIndex !== null &&
    s.assetBracketIndex !== null &&
    s.carBand !== null &&
    s.livesInBusan !== null
  );
}

/** store 값 → 판정용 EligibilityCommonInput (미완료면 null). */
export function buildCommonInput(s: EligibilityState): EligibilityCommonInput | null {
  if (!isCommonComplete(s)) return null;
  const householdSize = Math.min(Math.max(s.members.length, 1), 8);
  const income = incomeBrackets(householdSize)[s.incomeBracketIndex!];
  const asset = ASSET_BRACKETS[s.assetBracketIndex!];
  return {
    ownSelfHouse: s.ownSelfHouse!,
    ownMemberHouse: s.ownMemberHouse!,
    hasRestriction: s.hasRestriction!,
    birthISO: s.birthISO,
    ageYears: calcKoreanAge(s.birthISO) ?? 0,
    members: s.members,
    householdSize,
    incomeManwon: income.repManwon,
    assetManwon: asset.repManwon,
    carBand: s.carBand!,
    livesInBusan: s.livesInBusan!,
  };
}
