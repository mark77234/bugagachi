"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AppHeader } from "./AppHeader";
import { MobileNavigation } from "./MobileNavigation";
import { cn } from "@/lib/utils";

/** 설문 flow 경로에서는 하단 내비 대신 각 페이지의 고정 이전/다음 바를 사용한다. */
const FLOW_PREFIXES = ["/eligibility", "/preferences"];
/** 갈붕 지도·상세 추천은 화면 전체를 지도에 쓰고, 내비게이션은 페이지 내부 플로팅 UI로 제공한다. */
const FULLSCREEN_PREFIXES = ["/map", "/recommendations"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);
  const isFlow = FLOW_PREFIXES.some((p) => pathname.startsWith(p));
  const isFullscreen = FULLSCREEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: false }));
    }
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        본문 바로가기
      </a>
      {!isFlow && !isFullscreen && <AppHeader />}
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className={cn(
          "focus:outline-none",
          isFullscreen ? "flex-1" : isFlow ? "flex-1 pb-28" : "flex-1 pb-20 md:pb-10",
        )}
      >
        {children}
      </main>
      {!isFlow && !isFullscreen && <MobileNavigation />}
    </div>
  );
}
