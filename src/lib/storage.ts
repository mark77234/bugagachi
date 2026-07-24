/** SSR-safe localStorage helpers. Zustand persist uses these indirectly;
 *  exported for ad-hoc reads/writes and a single point to swap backends. */

export const STORAGE_KEYS = {
  eligibility: "dongnaefit.eligibility.v1",
  preferences: "dongnaefit.preferences.v1",
  user: "dongnaefit.user.v1",
} as const;

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readJSON<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Clear all app data (마이페이지 데이터 삭제). */
export function clearAllAppData(): void {
  Object.values(STORAGE_KEYS).forEach(removeKey);
}
