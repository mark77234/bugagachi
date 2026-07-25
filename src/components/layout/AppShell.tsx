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

function wallpaperFor(pathname: string) {
  if (pathname === "/") return "/assets/wallpapers/search_wallpaper_1.png";
  if (pathname.startsWith("/eligibility")) return "/assets/wallpapers/search_wallpaper_1.png";
  if (pathname.startsWith("/preferences")) return "/assets/wallpapers/search_wallpaper_2.png";
  if (pathname.startsWith("/recommendations")) return "/assets/wallpapers/map_wallpaper_2.png";
  if (pathname.startsWith("/map")) return "/assets/wallpapers/map_wallpaper_3.png";
  if (pathname.startsWith("/housing")) return "/assets/wallpapers/map_wallpaper_1.png";
  if (pathname.startsWith("/chat")) return "/assets/wallpapers/search_wallpaper_2.png";
  if (pathname.startsWith("/community")) return "/assets/wallpapers/map_wallpaper_4.png";
  return "/assets/wallpapers/map_wallpaper_5.png";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);
  const isFlow = FLOW_PREFIXES.some((p) => pathname.startsWith(p));
  const isFullscreen = FULLSCREEN_PREFIXES.some((p) => pathname.startsWith(p));
  const wallpaper = wallpaperFor(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: false }));
    }
  }, [pathname]);

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${wallpaper}")` }}
      >
        <div className="absolute inset-0 bg-bg/78" />
      </div>
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
          "relative z-10 focus:outline-none",
          isFullscreen ? "flex-1" : isFlow ? "flex-1 pb-28" : "flex-1 pb-20 md:pb-10",
        )}
      >
        {children}
      </main>
      {!isFlow && !isFullscreen && <MobileNavigation />}
    </div>
  );
}
