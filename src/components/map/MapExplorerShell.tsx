"use client";

import { useState, type ReactNode, type Ref } from "react";
import { ListFilter, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MapPanel } from "@/components/map/MapPanel";
import { BrandLogo } from "@/components/layout/BrandLogo";
import type { MapViewProps } from "@/components/map/MapView";
import { cn } from "@/lib/utils";

/** 플로팅 컨트롤 공통 스타일 (지도/추천 화면에서 동일하게 사용). */
export const FLOATING_PANEL =
  "rounded-full border border-border bg-surface/95 shadow-[var(--shadow-card)] backdrop-blur";

/**
 * 전체화면 지도 탐색 셸.
 * 전체 재고 지도와 생활 취향 추천이 하나의 화면이므로 레이아웃·인터랙션도 여기 한 곳에 모은다.
 * (데이터·목록 카드만 각 화면에서 주입)
 */
export function MapExplorerShell({
  mapProps,
  controls,
  listTitle,
  listRef,
  children,
  sheet,
  listCount,
  assistant,
  overlay,
}: {
  mapProps: MapViewProps;
  /** 좌측 상단에 놓이는 플로팅 컨트롤 (필터·정렬 등) */
  controls?: ReactNode;
  /** 사이드바 헤더 좌측 내용 */
  listTitle: ReactNode;
  listRef?: Ref<HTMLDivElement>;
  /** 사이드바 목록 본문 */
  children: ReactNode;
  /** 모바일 바텀시트 */
  sheet?: ReactNode;
  listCount: number;
  /** 우측 하단 AI 갈붕 패널 */
  assistant?: ReactNode;
  /** 지도 하단 중앙 오버레이 (인프라 범례 등) */
  overlay?: ReactNode;
}) {
  const [listOpen, setListOpen] = useState(true);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-surface-muted">
      {/* 지도 (전체 화면) */}
      <div className="absolute inset-0">
        <MapPanel {...mapProps} fullBleed />
      </div>

      {/* 좌측 상단 플로팅: 로고(홈) + 컨트롤 */}
      <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-col items-start gap-2 sm:left-4 sm:top-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <BrandLogo
            priority
            className={cn(
              FLOATING_PANEL,
              "flex h-12 items-center gap-2 px-3 transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
            )}
            logoClassName="h-8"
            titleClassName="h-6"
          />
        </div>

        {controls && <div className="pointer-events-auto flex flex-wrap items-center gap-2">{controls}</div>}
      </div>

      {/* 데스크톱: 플로팅 사이드바 목록 */}
      <AnimatePresence initial={false}>
        {listOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-4 left-4 top-[13.5rem] z-20 hidden w-[380px] flex-col overflow-hidden rounded-[var(--radius-cardlg)] border border-border bg-surface/97 shadow-[var(--shadow-sheet)] backdrop-blur lg:flex"
            aria-label="주택 목록"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              {listTitle}
              <button
                type="button"
                onClick={() => setListOpen(false)}
                aria-label="목록 닫기"
                className="shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
              {children}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 목록 다시 열기 (데스크톱) */}
      {!listOpen && (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className={cn(
            FLOATING_PANEL,
            "absolute bottom-4 left-4 z-20 hidden h-12 items-center gap-2 px-4 text-sm font-bold text-fg transition-colors hover:bg-surface lg:flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
          )}
        >
          <ListFilter className="h-4 w-4 text-primary" aria-hidden />
          목록 {listCount}곳 보기
        </button>
      )}

      {/* 지도 하단 중앙 오버레이 (인프라 범례) */}
      {overlay && (
        <div className="pointer-events-none absolute bottom-[8.5rem] left-1/2 z-20 hidden -translate-x-1/2 lg:block">
          {overlay}
        </div>
      )}

      {/* 우측 하단 AI 갈붕 패널 */}
      {assistant && (
        <div className="pointer-events-none absolute bottom-[8.5rem] right-3 z-30 flex justify-end sm:right-4 lg:bottom-4">
          {assistant}
        </div>
      )}

      {/* 모바일: 바텀시트 */}
      {sheet}
    </div>
  );
}
