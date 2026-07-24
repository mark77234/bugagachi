/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { MockMapView, type MapViewProps } from "./MapView";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SDK_ID = "kakao-maps-sdk";
const BUSAN_CENTER = { lat: 35.16, lng: 129.07 };

declare global {
  interface Window {
    kakao?: any;
  }
}

/** 카카오 SDK 스크립트를 1회 로드. autoload=false → kakao.maps.load 콜백에서 초기화. */
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

/** 실제 카카오 지도. 키가 없거나 로드 실패 시 MockMapView로 폴백. */
export function KakaoMapView({ markers, selectedId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerObjs = useRef<{ id: string; marker: any }[]>([]);
  const onSelectRef = useRef(onSelect);
  const [failed, setFailed] = useState(!KAKAO_KEY);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // 지도 초기화
  useEffect(() => {
    if (!KAKAO_KEY) return;
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(BUSAN_CENTER.lat, BUSAN_CENTER.lng),
          level: 7,
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // 마커 렌더 (markers 변경 시 재생성)
  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao?.maps || !mapRef.current) return;
    markerObjs.current.forEach(({ marker }) => marker.setMap(null));
    markerObjs.current = markers.map((m) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(m.coord.lat, m.coord.lng),
        title: m.label,
      });
      marker.setMap(mapRef.current);
      kakao.maps.event.addListener(marker, "click", () => onSelectRef.current(m.id));
      return { id: m.id, marker };
    });
  }, [markers, failed]);

  // 선택 마커 강조 + 이동
  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao?.maps || !mapRef.current || !selectedId) return;
    const hit = markerObjs.current.find((o) => o.id === selectedId);
    if (hit) {
      hit.marker.setZIndex(10);
      mapRef.current.panTo(hit.marker.getPosition());
    }
    markerObjs.current.forEach((o) => o.id !== selectedId && o.marker.setZIndex(1));
  }, [selectedId]);

  if (failed) return <MockMapView markers={markers} selectedId={selectedId} onSelect={onSelect} />;

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[320px] w-full overflow-hidden rounded-[var(--radius-card)] border border-border"
      role="group"
      aria-label="추천 주택 지도"
    />
  );
}
