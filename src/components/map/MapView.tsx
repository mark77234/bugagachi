"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { LatLng } from "@/lib/coordinates";
import { cn } from "@/lib/utils";

/** 지도 provider 인터페이스. 실제 카카오 지도 연동 시 KakaoMapView가 동일 props를 구현한다.
 *  (환경변수에 API Key가 없으면 실제 요청을 만들지 않고 MockMapView를 사용한다.) */
export interface MapMarker {
  id: string;
  coord: LatLng;
  label: string;
  caption?: string;
  /** 같은 위치(건물/상가)에 묶인 주택 수. 1보다 크면 클러스터 마커. */
  count?: number;
}

/** 지도 마커에 함께 노출하는 브랜드 로고. */
export const MAP_MARKER_LOGO = "/assets/logo/bugagachi_website_logo.png";

export interface MapViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewProps {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  onViewportChange?: (bounds: MapViewportBounds) => void;
  /** 전체화면 지도: 테두리·라운드 없이 화면을 꽉 채운다. */
  fullBleed?: boolean;
}

// 부산 대략 경계 (WGS84)
const BOUNDS = { latMax: 35.32, latMin: 35.04, lngMin: 128.86, lngMax: 129.27 };
export const BUSAN_MOCK_VIEWPORT: MapViewportBounds = {
  north: BOUNDS.latMax,
  south: BOUNDS.latMin,
  east: BOUNDS.lngMax,
  west: BOUNDS.lngMin,
};

function project(coord: LatLng) {
  const x = ((coord.lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * 100;
  const y = ((BOUNDS.latMax - coord.lat) / (BOUNDS.latMax - BOUNDS.latMin)) * 100;
  return { left: `${Math.min(96, Math.max(4, x))}%`, top: `${Math.min(94, Math.max(6, y))}%` };
}

/** Kakao API Key 부재 시 사용하는 mock 지도. */
export function MockMapView({
  markers,
  selectedId,
  onSelect,
  ariaLabel = "주택 위치 지도 (모의)",
  onViewportChange,
  fullBleed = false,
}: MapViewProps) {
  useEffect(() => {
    onViewportChange?.(BUSAN_MOCK_VIEWPORT);
  }, [onViewportChange]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        fullBleed ? "" : "min-h-[320px] rounded-[var(--radius-card)] border border-border",
      )}
      style={{
        backgroundColor: "#e8eeec",
        backgroundImage:
          "linear-gradient(0deg, rgba(15,118,110,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,0.06) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-muted">
        지도 미리보기 (모의) · 카카오 지도 연동 예정
      </span>
      {markers.map((m) => {
        const active = m.id === selectedId;
        const pos = project(m.coord);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            aria-label={`${m.label}${m.caption ? `, ${m.caption}` : ""}`}
            aria-pressed={active}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-full transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
              active ? "z-20 scale-110" : "z-10 hover:scale-105",
            )}
            style={pos}
          >
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border py-1 pl-1 pr-2.5 text-xs font-bold shadow-[var(--shadow-card)]",
                active ? "border-primary bg-primary text-white" : "border-border bg-surface text-fg",
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white">
                <Image src={MAP_MARKER_LOGO} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
              </span>
              {m.caption ?? m.label}
              {m.count && m.count > 1 ? (
                <span className={cn("ml-0.5 rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-white/25" : "bg-primary-subtle text-primary")}>
                  {m.count}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
