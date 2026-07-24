"use client";

import { useEffect, useState } from "react";

interface PersistApi {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
}

/** zustand persist 스토어의 localStorage 복구 완료 여부. SSR 하이드레이션 불일치 방지. */
export function useHydrated<T extends PersistApi>(store: T): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = store.persist.onFinishHydration(() => setHydrated(true));
    // 이미 복구가 끝난 경우(동기 storage)도 처리 — effect 내 즉시 setState 대신 다음 틱으로 지연
    const id = setTimeout(() => {
      if (store.persist.hasHydrated()) setHydrated(true);
    }, 0);
    return () => {
      unsub();
      clearTimeout(id);
    };
  }, [store]);
  return hydrated;
}
