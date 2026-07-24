"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/storage";
import type {
  EduCategory,
  FrequentDestination,
  InfraCategory,
  NeighborhoodMood,
  PreferenceSurveyInput,
  ScoreAxis,
} from "./recommendation.types";

interface PreferencesState {
  hydrated: boolean;
  maxDeposit: number | null;
  maxMonthlyRent: number | null;
  gungus: string[];
  anyRegion: boolean;
  frequent: FrequentDestination[];
  infraCategories: InfraCategory[];
  eduEnabled: boolean | null;
  eduCategories: EduCategory[];
  storeChips: string[];
  storeCustom: string[];
  mood: NeighborhoodMood | null;
  skipped: ScoreAxis[];

  setBudget: (v: { maxDeposit?: number; maxMonthlyRent?: number }) => void;
  toggleGungu: (name: string) => void;
  setAnyRegion: (v: boolean) => void;
  addFrequent: (d: FrequentDestination) => void;
  removeFrequent: (id: string) => void;
  toggleInfra: (c: InfraCategory) => void;
  setEduEnabled: (v: boolean) => void;
  toggleEdu: (c: EduCategory) => void;
  toggleChip: (chip: string) => void;
  addCustom: (chip: string) => void;
  removeCustom: (chip: string) => void;
  setMood: (m: NeighborhoodMood) => void;
  setSkip: (axis: ScoreAxis, skip: boolean) => void;
  reset: () => void;
}

const initial = {
  maxDeposit: null,
  maxMonthlyRent: null,
  gungus: [] as string[],
  anyRegion: false,
  frequent: [] as FrequentDestination[],
  infraCategories: [] as InfraCategory[],
  eduEnabled: null as boolean | null,
  eduCategories: [] as EduCategory[],
  storeChips: [] as string[],
  storeCustom: [] as string[],
  mood: null as NeighborhoodMood | null,
  skipped: [] as ScoreAxis[],
};

const toggle = <T>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...initial,
      setBudget: (v) => set((s) => ({ ...s, ...v })),
      toggleGungu: (name) => set((s) => ({ gungus: toggle(s.gungus, name), anyRegion: false })),
      setAnyRegion: (v) => set({ anyRegion: v, gungus: [] }),
      addFrequent: (d) => set((s) => ({ frequent: [...s.frequent, d] })),
      removeFrequent: (id) => set((s) => ({ frequent: s.frequent.filter((f) => f.id !== id) })),
      toggleInfra: (c) => set((s) => ({ infraCategories: toggle(s.infraCategories, c) })),
      setEduEnabled: (v) => set((s) => ({ eduEnabled: v, eduCategories: v ? s.eduCategories : [] })),
      toggleEdu: (c) => set((s) => ({ eduCategories: toggle(s.eduCategories, c) })),
      toggleChip: (chip) => set((s) => ({ storeChips: toggle(s.storeChips, chip) })),
      addCustom: (chip) =>
        set((s) => (chip && !s.storeCustom.includes(chip) ? { storeCustom: [...s.storeCustom, chip] } : s)),
      removeCustom: (chip) => set((s) => ({ storeCustom: s.storeCustom.filter((c) => c !== chip) })),
      setMood: (m) => set({ mood: m }),
      setSkip: (axis, skip) =>
        set((s) => ({ skipped: skip ? [...new Set([...s.skipped, axis])] : s.skipped.filter((a) => a !== axis) })),
      reset: () => set({ ...initial }),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: ({ hydrated: _h, ...rest }) => rest,
    },
  ),
);

export function isBudgetComplete(s: PreferencesState): boolean {
  return s.maxDeposit !== null && s.maxMonthlyRent !== null;
}

export function buildSurvey(s: PreferencesState): PreferenceSurveyInput {
  return {
    budget: { maxDeposit: s.maxDeposit ?? 0, maxMonthlyRent: s.maxMonthlyRent ?? 0 },
    region: { gungus: s.gungus, anyRegion: s.anyRegion },
    frequent: s.frequent,
    infra: { categories: s.infraCategories },
    education: { enabled: s.eduEnabled === true, categories: s.eduCategories },
    store: { chips: s.storeChips, custom: s.storeCustom },
    neighborhood: { mood: s.mood },
    skipped: s.skipped,
  };
}
