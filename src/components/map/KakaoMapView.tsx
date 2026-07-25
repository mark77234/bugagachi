/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { MockMapView, MAP_MARKER_ICON, type MapMarker, type MapViewProps, type MapViewportBounds } from "./MapView";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SDK_ID = "kakao-maps-sdk";
const BUSAN_CENTER = { lat: 35.16, lng: 129.07 };

declare global {
  interface Window {
    kakao?: any;
  }
}

function loadKakao(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.kakao?.maps) return resolve(window.kakao);

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    const onReady = () => window.kakao.maps.load(() => resolve(window.kakao));
    if (existing) {
      if (window.kakao) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("sdk error")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = SDK_ID;
    s.async = true;
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    s.addEventListener("load", onReady, { once: true });
    s.addEventListener("error", () => reject(new Error("sdk error")), { once: true });
    document.head.appendChild(s);
  });
}

/** 전용 마커 아이콘 + 금액(+그룹 수) 마커. */
function buildPin(m: MapMarker, active: boolean, onClick: () => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `${m.label}${m.caption ? `, ${m.caption}` : ""}${m.count && m.count > 1 ? `, 이 위치 ${m.count}곳` : ""}`);

  const icon = document.createElement("span");
  Object.assign(icon.style, {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "18px", height: "24px", overflow: "hidden", flexShrink: "0",
  } as CSSStyleDeclaration);
  const img = document.createElement("img");
  img.src = MAP_MARKER_ICON;
  img.alt = "";
  Object.assign(img.style, { width: "18px", height: "24px", objectFit: "contain" } as CSSStyleDeclaration);
  icon.appendChild(img);

  const price = document.createElement("span");
  price.textContent = m.caption ?? m.label;

  el.appendChild(icon);
  el.appendChild(price);

  if (m.count && m.count > 1) {
    const badge = document.createElement("span");
    badge.textContent = String(m.count);
    badge.dataset.badge = "1";
    Object.assign(badge.style, {
      fontSize: "10px", lineHeight: "1", padding: "2px 5px", borderRadius: "9999px", marginLeft: "1px",
    } as CSSStyleDeclaration);
    el.appendChild(badge);
  }

  stylePin(el, active);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

function stylePin(el: HTMLButtonElement, active: boolean) {
  el.setAttribute("aria-pressed", String(active));
  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 9px 3px 3px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: "1",
    whiteSpace: "nowrap",
    cursor: "pointer",
    transform: active ? "translateY(-6px) scale(1.08)" : "translateY(-6px)",
    border: "1.5px solid",
    boxShadow: active ? "0 6px 16px rgba(15,124,123,0.35)" : "0 2px 6px rgba(15,23,42,0.18)",
    transition: "transform .15s ease, box-shadow .15s ease",
    borderColor: active ? "var(--color-primary)" : "var(--color-border)",
    background: active ? "var(--color-primary)" : "var(--color-surface)",
    color: active ? "#ffffff" : "var(--color-fg)",
    zIndex: active ? "20" : "1",
  } as CSSStyleDeclaration);
  const badge = el.querySelector<HTMLElement>('[data-badge="1"]');
  if (badge) {
    badge.style.background = active ? "rgba(255,255,255,0.25)" : "var(--color-primary-subtle)";
    badge.style.color = active ? "#ffffff" : "var(--color-primary)";
  }
}

export function KakaoMapView({
  markers,
  selectedId,
  onSelect,
  ariaLabel = "주택 위치 지도",
  onViewportChange,
  fullBleed = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<{ id: string; overlay: any; el: HTMLButtonElement }[]>([]);
  const onSelectRef = useRef(onSelect);
  const onViewportChangeRef = useRef(onViewportChange);
  const markersRef = useRef<MapMarker[]>(markers);
  const didInitialFitRef = useRef(false);
  const [failed, setFailed] = useState(!KAKAO_KEY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  const reportViewport = (map: any) => {
    if (!map || !onViewportChangeRef.current) return;
    const bounds = map.getBounds();
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();
    onViewportChangeRef.current({
      north: northEast.getLat(),
      south: southWest.getLat(),
      east: northEast.getLng(),
      west: southWest.getLng(),
    } satisfies MapViewportBounds);
  };

  /** 모든 마커가 보이도록 뷰포트 맞춤. 사용자 조작(줌)을 덮어쓰지 않도록 명시적 호출/최초 1회에만 사용. */
  const fitAll = () => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map || !containerRef.current || containerRef.current.clientWidth === 0) return;
    map.relayout();
    const list = markersRef.current;
    if (list.length === 1) {
      map.setCenter(new kakao.maps.LatLng(list[0].coord.lat, list[0].coord.lng));
      map.setLevel(5);
    } else if (list.length > 1) {
      const bounds = new kakao.maps.LatLngBounds();
      list.forEach((m) => bounds.extend(new kakao.maps.LatLng(m.coord.lat, m.coord.lng)));
      map.setBounds(bounds);
    }
  };

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setLevel(map.getLevel() + delta, { animate: true });
  };

  // 지도 초기화. ResizeObserver 는 relayout 만 (줌/센터 보존). fitAll 은 최초 1회.
  useEffect(() => {
    if (!KAKAO_KEY) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    let kakaoInstance: any;
    let idleHandler: (() => void) | undefined;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        kakaoInstance = kakao;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(BUSAN_CENTER.lat, BUSAN_CENTER.lng),
          level: 7,
        });
        // 마우스 휠 줌 활성화
        mapRef.current.setZoomable(true);
        idleHandler = () => reportViewport(mapRef.current);
        kakao.maps.event.addListener(mapRef.current, "idle", idleHandler);
        setReady(true);
        // 컨테이너 리사이즈 시 레이아웃만 다시 계산 (센터/줌 유지)
        ro = new ResizeObserver(() => mapRef.current?.relayout());
        ro.observe(containerRef.current);
        reportViewport(mapRef.current);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      ro?.disconnect();
      if (kakaoInstance?.maps && mapRef.current && idleHandler) {
        kakaoInstance.maps.event.removeListener(mapRef.current, "idle", idleHandler);
      }
    };
  }, []);

  // 마커 렌더 — markers 변경 시 재생성. 최초 1회만 전체 fit (이후엔 사용자 줌 보존).
  useEffect(() => {
    const kakao = window.kakao;
    if (!ready || !kakao?.maps || !mapRef.current) return;
    markersRef.current = markers;
    overlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
    overlaysRef.current = markers.map((m) => {
      const active = m.id === selectedId;
      const el = buildPin(m, active, () => onSelectRef.current(m.id));
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(m.coord.lat, m.coord.lng),
        content: el,
        yAnchor: 1,
        zIndex: active ? 20 : 1,
      });
      overlay.setMap(mapRef.current);
      return { id: m.id, overlay, el };
    });
    if (!didInitialFitRef.current && markers.length > 0) {
      didInitialFitRef.current = true;
      requestAnimationFrame(() => fitAll());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, ready]);

  // 선택 마커 강조 + 이동 (재생성 없이 스타일만 토글)
  useEffect(() => {
    const kakao = window.kakao;
    if (!ready || !kakao?.maps || !mapRef.current) return;
    overlaysRef.current.forEach(({ id, overlay, el }) => {
      const active = id === selectedId;
      stylePin(el, active);
      overlay.setZIndex(active ? 20 : 1);
      if (active) mapRef.current.panTo(overlay.getPosition());
    });
  }, [selectedId, ready]);

  if (failed) {
    return (
      <MockMapView
        markers={markers}
        selectedId={selectedId}
        onSelect={onSelect}
        ariaLabel={`${ariaLabel} (모의)`}
        onViewportChange={onViewportChange}
        fullBleed={fullBleed}
      />
    );
  }

  return (
    <div className={fullBleed ? "relative h-full w-full" : "relative h-full min-h-[300px] w-full"}>
      <div
        ref={containerRef}
        className={
          fullBleed
            ? "h-full w-full"
            : "h-full min-h-[300px] w-full overflow-hidden rounded-[var(--radius-card)] border border-border"
        }
        role="group"
        aria-label={ariaLabel}
      />
      {/* 줌/전체보기 컨트롤 */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <div className="flex flex-col overflow-hidden rounded-[var(--radius-input)] border border-border bg-surface shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => zoomBy(-1)}
            aria-label="지도 확대"
            className="flex h-10 w-10 items-center justify-center text-fg transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
          <span className="h-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={() => zoomBy(1)}
            aria-label="지도 축소"
            className="flex h-10 w-10 items-center justify-center text-fg transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
          >
            <Minus className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={fitAll}
          aria-label="전체 주택 보기"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] border border-border bg-surface text-fg shadow-[var(--shadow-card)] transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
