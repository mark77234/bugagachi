"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS, clearAllAppData } from "@/lib/storage";

interface UserState {
  hydrated: boolean;
  isGuest: boolean;
  savedHousingIds: string[];
  recentHousingIds: string[];
  notifications: { recruitOpen: boolean; savedUpdate: boolean };
  applicationChecks: Record<string, string[]>; // housingId -> 체크된 항목 id

  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  addRecent: (id: string) => void;
  setNotification: (k: "recruitOpen" | "savedUpdate", v: boolean) => void;
  toggleCheck: (housingId: string, itemId: string) => void;
  clearAll: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      isGuest: true,
      savedHousingIds: [],
      recentHousingIds: [],
      notifications: { recruitOpen: true, savedUpdate: false },
      applicationChecks: {},

      toggleSaved: (id) =>
        set((s) => ({
          savedHousingIds: s.savedHousingIds.includes(id)
            ? s.savedHousingIds.filter((x) => x !== id)
            : [...s.savedHousingIds, id],
        })),
      isSaved: (id) => get().savedHousingIds.includes(id),
      addRecent: (id) =>
        set((s) => ({ recentHousingIds: [id, ...s.recentHousingIds.filter((x) => x !== id)].slice(0, 12) })),
      setNotification: (k, v) => set((s) => ({ notifications: { ...s.notifications, [k]: v } })),
      toggleCheck: (housingId, itemId) =>
        set((s) => {
          const cur = s.applicationChecks[housingId] ?? [];
          const next = cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId];
          return { applicationChecks: { ...s.applicationChecks, [housingId]: next } };
        }),
      clearAll: () => {
        clearAllAppData();
        set({
          savedHousingIds: [],
          recentHousingIds: [],
          notifications: { recruitOpen: true, savedUpdate: false },
          applicationChecks: {},
        });
      },
    }),
    {
      name: STORAGE_KEYS.user,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: ({ hydrated: _h, ...rest }) => rest,
    },
  ),
);
