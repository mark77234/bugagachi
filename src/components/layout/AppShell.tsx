"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AppHeader } from "./AppHeader";
import { MobileNavigation } from "./MobileNavigation";
import { cn } from "@/lib/utils";
import { WorkspaceNavigation } from "./WorkspaceNavigation";

/** 설문 flow 경로에서는 하단 내비 대신 각 페이지의 고정 이전/다음 바를 사용한다. */
const FLOW_PREFIXES = ["/eligibility", "/preferences"];
const WORKSPACE_PREFIXES = ["/recommendations", "/map"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);
  const isFlow = FLOW_PREFIXES.some((p) => pathname.startsWith(p));
  const isWorkspace = WORKSPACE_PREFIXES.some((p) => pathname.startsWith(p));

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
      {!isWorkspace && !isFlow && <AppHeader />}
      {isWorkspace && <WorkspaceNavigation />}
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className={cn(
          "focus:outline-none",
          isFlow ? "flex-1 pb-28" : "flex-1 pb-20 md:pb-10",
          isWorkspace && "md:pl-[82px]",
        )}
      >
        {children}
      </main>
      {!isFlow && <MobileNavigation />}
    </div>
  );
}
