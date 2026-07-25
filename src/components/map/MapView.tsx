"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { LatLng } from "@/lib/coordinates";
import { cn } from "@/lib/utils";

/** 지도 provider 인터페이스. 실제 카카오 지도 연동 시 KakaoMapView가 동일 props를 구현한다.
 *  (환경변수에 API Key가 없으면 실제 요청을 만들지 않고 MockMapView를 사용한다.) */

/** 마커 구분.
 *  normal    — 전체 재고
 *  recommend — 2단계 생활 취향 추천에 포함된 주택
 *  ai        — AI 갈붕이 대화에서 추천한 주택 */
export type MarkerTier = "normal" | "recommend" | "ai";

export interface MapMarker {
  id: string;
  coord: LatLng;
  label: string;
  caption?: string;
  /** 같은 위치(건물/상가)에 묶인 주택 수. 1보다 크면 그룹 마커. */
  count?: number;
  tier?: MarkerTier;
  /** 추천 순위(1부터). recommend 티어에서 배지로 노출한다. */
  rank?: number;
}

/** 선택된 주택 주변에 함께 찍는 인프라 핀. */
export interface MapInfraPoi {
  id: string;
  coord: LatLng;
  label: string;
  categoryLabel: string;
  /** required 는 강조, preference 는 약하게, education 은 설문에서 필요할 때만. */
  tier: "required" | "preference" | "education";
  distance: number;
}

/** 지도 마커에 사용하는 전용 핀 에셋. */
export const MAP_MARKER_ICON = "/assets/markers/ic_marker.png";

/** 티어별 마커 색상. 지도·범례·목록에서 같은 값을 쓴다. */
export const TIER_COLOR: Record<MarkerTier, { bg: string; border: string; fg: string; ring: string }> = {
  normal: { bg: "var(--color-surface)", border: "var(--color-border)", fg: "var(--color-fg)", ring: "rgba(15,23,42,0.18)" },
  recommend: { bg: "var(--color-primary)", border: "var(--color-primary)", fg: "#ffffff", ring: "rgba(15,124,123,0.35)" },
  ai: { bg: "#7c3aed", border: "#7c3aed", fg: "#ffffff", ring: "rgba(124,58,237,0.38)" },
};

/** 인프라 핀 색상 — 1순위는 진하게, 2순위는 옅게. */
export const INFRA_COLOR: Record<MapInfraPoi["tier"], { bg: string; fg: string; border: string }> = {
  required: { bg: "#0f7c7b", fg: "#ffffff", border: "#0f7c7b" },
  education: { bg: "#2563eb", fg: "#ffffff", border: "#2563eb" },
  preference: { bg: "rgba(255,255,255,0.94)", fg: "#5b6b68", border: "rgba(91,107,104,0.45)" },
};

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
  /** 선택된 주택 주변 인프라. 마커 이벤트가 있을 때만 채워 보낸다. */
  infra?: MapInfraPoi[];
  /** 마커 호버(포커스) 변경 알림. */
  onHoverChange?: (id: string | null) => void;
  /** 목록에서 호버 중인 주택 — 지도 마커도 함께 포커스한다. */
  hoveredId?: string | null;
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
  infra = [],
  onHoverChange,
  hoveredId = null,
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
          "linear-gradient(rgba(252,253,253,0.4), rgba(252,253,253,0.4)), url('/assets/wallpapers/map_wallpaper_4.png')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-muted">
        지도 미리보기 (모의) · 카카오 지도 연동 예정
      </span>

      {infra.map((poi) => {
        const color = INFRA_COLOR[poi.tier];
        const pos = project(poi.coord);
        return (
          <span
            key={poi.id}
            className="absolute z-[5] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm"
            style={{ ...pos, background: color.bg, color: color.fg, borderColor: color.border }}
          >
            {poi.categoryLabel}
          </span>
        );
      })}

      {markers.map((m) => {
        const active = m.id === selectedId;
        const focused = active || m.id === hoveredId;
        const color = TIER_COLOR[m.tier ?? "normal"];
        const pos = project(m.coord);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            onMouseEnter={() => onHoverChange?.(m.id)}
            onMouseLeave={() => onHoverChange?.(null)}
            onFocus={() => onHoverChange?.(m.id)}
            onBlur={() => onHoverChange?.(null)}
            aria-label={`${m.label}${m.caption ? `, ${m.caption}` : ""}`}
            aria-pressed={active}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-full transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
              focused ? "z-20 scale-110" : "z-10",
            )}
            style={pos}
          >
            <span
              className="flex items-center gap-1 rounded-full border py-1 pl-1 pr-2.5 text-xs font-bold shadow-[var(--shadow-card)]"
              style={{ background: color.bg, color: color.fg, borderColor: color.border }}
            >
              <span className="flex h-7 w-5 shrink-0 items-center justify-center">
                <Image src={MAP_MARKER_ICON} alt="" width={400} height={529} className="h-6 w-auto object-contain" />
              </span>
              {m.caption ?? m.label}
              {m.count && m.count > 1 ? (
                <span
                  className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{
                    background: m.tier && m.tier !== "normal" ? "rgba(255,255,255,0.25)" : "var(--color-primary-subtle)",
                    color: m.tier && m.tier !== "normal" ? "#ffffff" : "var(--color-primary)",
                  }}
                >
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
