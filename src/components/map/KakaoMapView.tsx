/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { MockMapView, type MapMarker, type MapViewProps } from "./MapView";

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

/** 우리 디자인의 가격 pill 마커 엘리먼트 (mock 지도와 동일한 룩). */
function buildPin(m: MapMarker, active: boolean, onClick: () => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `${m.label}${m.caption ? `, ${m.caption}` : ""}`);
  el.textContent = m.caption ?? m.label;
  stylePin(el, active);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

function stylePin(el: HTMLButtonElement, active: boolean) {
  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: "1",
    whiteSpace: "nowrap",
    cursor: "pointer",
    transform: active ? "translateY(-6px) scale(1.06)" : "translateY(-6px)",
    border: "1px solid",
    boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
    transition: "transform .15s ease",
    borderColor: active ? "var(--color-primary)" : "var(--color-border)",
    background: active ? "var(--color-primary)" : "var(--color-surface)",
    color: active ? "#ffffff" : "var(--color-fg)",
  } as CSSStyleDeclaration);
}

export function KakaoMapView({ markers, selectedId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<{ id: string; overlay: any; el: HTMLButtonElement }[]>([]);
  const onSelectRef = useRef(onSelect);
  const markersRef = useRef<MapMarker[]>(markers);
  const [failed, setFailed] = useState(!KAKAO_KEY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // relayout 후 마커 전체가 보이도록 뷰포트 맞춤 (컨테이너 크기 확정 후 호출해야 정확)
  const fitView = () => {
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

  // 지도 초기화 + 컨테이너 크기 변화 시 relayout (모바일 토글/리사이즈 대응)
  useEffect(() => {
    if (!KAKAO_KEY) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(BUSAN_CENTER.lat, BUSAN_CENTER.lng),
          level: 7,
        });
        setReady(true);
        ro = new ResizeObserver(() => fitView());
        ro.observe(containerRef.current);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, []);

  // 마커(CustomOverlay) 렌더 — markers 변경 시 재생성 + 전체가 보이도록 fit
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
        zIndex: active ? 10 : 1,
      });
      overlay.setMap(mapRef.current);
      return { id: m.id, overlay, el };
    });
    // 레이아웃 확정 후 fit (초기 0-width 방지 위해 다음 프레임에)
    requestAnimationFrame(() => fitView());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, ready]);

  // 선택 마커 강조 + 이동 (재생성 없이 스타일만 토글)
  useEffect(() => {
    const kakao = window.kakao;
    if (!ready || !kakao?.maps || !mapRef.current) return;
    overlaysRef.current.forEach(({ id, overlay, el }) => {
      const active = id === selectedId;
      stylePin(el, active);
      overlay.setZIndex(active ? 10 : 1);
      if (active) mapRef.current.panTo(overlay.getPosition());
    });
  }, [selectedId, ready]);

  if (failed) return <MockMapView markers={markers} selectedId={selectedId} onSelect={onSelect} />;

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[300px] w-full overflow-hidden rounded-[var(--radius-card)] border border-border"
      role="group"
      aria-label="추천 주택 지도"
    />
  );
}
