/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import {
  MockMapView,
  TIER_MARKER_ICON,
  INFRA_MARKER_ICON,
  TIER_COLOR,
  INFRA_COLOR,
  type MapInfraPoi,
  type MapMarker,
  type MapViewProps,
  type MapViewportBounds,
  type MarkerTier,
} from "./MapView";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SDK_ID = "kakao-maps-sdk";
const BUSAN_CENTER = { lat: 35.16, lng: 129.07 };

/** 클러스터 격자 한 칸의 화면 크기(px). 이 안에 들어오는 마커는 하나로 묶는다.
 *  금액 라벨이 붙은 핀의 실제 너비(약 100px)보다 크게 잡아야 핀끼리 덜 겹친다. */
const CLUSTER_CELL_PX = 120;
/** 클러스터를 누를 때 한 번에 확대할 레벨 수. */
const CLUSTER_ZOOM_STEP = 2;

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

/** 화면에 그릴 단위 — 개별 마커 또는 여러 마커를 묶은 클러스터. */
type Cluster = {
  key: string;
  coord: { lat: number; lng: number };
  members: MapMarker[];
  /** 묶인 마커 중 가장 강한 티어 (ai > recommend > normal) */
  tier: MarkerTier;
};

const TIER_RANK: Record<MarkerTier, number> = { normal: 0, recommend: 1, ai: 2 };

function strongestTier(markers: MapMarker[]): MarkerTier {
  return markers.reduce<MarkerTier>((best, m) => {
    const tier = m.tier ?? "normal";
    return TIER_RANK[tier] > TIER_RANK[best] ? tier : best;
  }, "normal");
}

/**
 * 화면 좌표 격자로 마커를 묶는다.
 * 위경도가 아니라 픽셀 기준이므로 겹치는 마커만 묶이고, 확대할수록 클러스터가 저절로 풀린다.
 * 선택된 마커는 항상 단독으로 남겨 강조가 묻히지 않게 한다.
 */
function clusterMarkers(kakao: any, map: any, markers: MapMarker[], selectedId: string | null): Cluster[] {
  if (!map) {
    return markers.map((m) => ({ key: m.id, coord: m.coord, members: [m], tier: m.tier ?? "normal" }));
  }
  const projection = map.getProjection();
  const cells = new Map<string, MapMarker[]>();
  const singles: Cluster[] = [];

  for (const marker of markers) {
    if (marker.id === selectedId) {
      singles.push({ key: marker.id, coord: marker.coord, members: [marker], tier: marker.tier ?? "normal" });
      continue;
    }
    const point = projection.containerPointFromCoords(new kakao.maps.LatLng(marker.coord.lat, marker.coord.lng));
    const key = `${Math.floor(point.x / CLUSTER_CELL_PX)}:${Math.floor(point.y / CLUSTER_CELL_PX)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(marker);
    else cells.set(key, [marker]);
  }

  const clustered: Cluster[] = [];
  for (const [key, members] of cells) {
    if (members.length === 1) {
      const only = members[0];
      clustered.push({ key: only.id, coord: only.coord, members, tier: only.tier ?? "normal" });
      continue;
    }
    const lat = members.reduce((sum, m) => sum + m.coord.lat, 0) / members.length;
    const lng = members.reduce((sum, m) => sum + m.coord.lng, 0) / members.length;
    clustered.push({ key: `cluster-${key}`, coord: { lat, lng }, members, tier: strongestTier(members) });
  }
  return [...clustered, ...singles];
}

/** 개별 주택 마커 — 전용 핀 아이콘 + 금액(+그룹 수). */
function buildPin(marker: MapMarker, onClick: () => void, onHover: (hovering: boolean) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute(
    "aria-label",
    `${marker.label}${marker.caption ? `, ${marker.caption}` : ""}${
      marker.count && marker.count > 1 ? `, 이 위치 ${marker.count}곳` : ""
    }${marker.tier === "recommend" ? ", 취향 추천" : marker.tier === "ai" ? ", AI 갈붕이 추천" : ""}`,
  );

  const icon = document.createElement("span");
  Object.assign(icon.style, {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "20px", height: "24px", overflow: "hidden", flexShrink: "0",
  } as CSSStyleDeclaration);
  const img = document.createElement("img");
  img.src = TIER_MARKER_ICON[marker.tier ?? "normal"];
  img.alt = "";
  Object.assign(img.style, { width: "20px", height: "24px", objectFit: "contain" } as CSSStyleDeclaration);
  icon.appendChild(img);

  const price = document.createElement("span");
  price.textContent = marker.caption ?? marker.label;

  el.appendChild(icon);
  el.appendChild(price);

  if (marker.count && marker.count > 1) {
    const badge = document.createElement("span");
    badge.textContent = String(marker.count);
    badge.dataset.badge = "1";
    Object.assign(badge.style, {
      fontSize: "10px", lineHeight: "1", padding: "2px 5px", borderRadius: "9999px", marginLeft: "1px",
    } as CSSStyleDeclaration);
    el.appendChild(badge);
  }

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  el.addEventListener("mouseenter", () => onHover(true));
  el.addEventListener("mouseleave", () => onHover(false));
  el.addEventListener("focus", () => onHover(true));
  el.addEventListener("blur", () => onHover(false));
  return el;
}

function stylePin(el: HTMLButtonElement, tier: MarkerTier, active: boolean, hovered: boolean) {
  const color = TIER_COLOR[tier];
  el.setAttribute("aria-pressed", String(active));
  // 선택된 마커는 색을 티어 색으로 채우고 굵은 링을 둘러 한눈에 구분되게 한다.
  const selectedBg = tier === "normal" ? "var(--color-primary)" : color.bg;
  const selectedFg = tier === "normal" ? "#ffffff" : color.fg;
  const selectedRing = tier === "normal" ? "rgba(15,124,123,0.35)" : color.ring;
  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: active ? "5px 12px 5px 4px" : "3px 9px 3px 3px",
    borderRadius: "9999px",
    fontSize: active ? "13px" : "12px",
    fontWeight: active ? "800" : "700",
    lineHeight: "1",
    whiteSpace: "nowrap",
    cursor: "pointer",
    transform: active ? "translateY(-10px) scale(1.16)" : hovered ? "translateY(-8px) scale(1.07)" : "translateY(-6px)",
    border: active ? "2.5px solid #ffffff" : "1.5px solid",
    boxShadow: active
      ? `0 0 0 3px ${selectedRing}, 0 10px 24px rgba(15,23,42,0.3)`
      : hovered
        ? `0 8px 20px ${color.ring}`
        : "0 2px 6px rgba(15,23,42,0.18)",
    outline: hovered && !active ? `2px solid ${color.border}` : "none",
    outlineOffset: "2px",
    transition: "transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s ease, padding .18s ease",
    borderColor: active ? "#ffffff" : color.border,
    background: active ? selectedBg : color.bg,
    color: active ? selectedFg : color.fg,
    zIndex: active ? "40" : hovered ? "25" : tier === "normal" ? "1" : "10",
  } as CSSStyleDeclaration);
  const badge = el.querySelector<HTMLElement>('[data-badge="1"]');
  if (badge) {
    const onColor = tier !== "normal" || active;
    badge.style.background = onColor ? "rgba(255,255,255,0.25)" : "var(--color-primary-subtle)";
    badge.style.color = onColor ? "#ffffff" : "var(--color-primary)";
  }
  // 선택 표시용 펄스 링 (선택 시에만 붙인다)
  let pulse = el.querySelector<HTMLElement>('[data-pulse="1"]');
  if (active && !pulse) {
    pulse = document.createElement("span");
    pulse.dataset.pulse = "1";
    Object.assign(pulse.style, {
      position: "absolute",
      inset: "-10px",
      borderRadius: "9999px",
      border: `2px solid ${selectedBg}`,
      opacity: "0.55",
      pointerEvents: "none",
      animation: "bgc-pin-pulse 1.6s ease-out infinite",
    } as CSSStyleDeclaration);
    el.style.position = "relative";
    el.appendChild(pulse);
  } else if (!active && pulse) {
    pulse.remove();
  }
}

/** 클러스터 버블 — 개수 + "곳" 라벨을 2줄로 두고, 누르면 그 지점으로 확대한다. */
function buildCluster(cluster: Cluster, onClick: () => void, onHover: (hovering: boolean) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `주택 ${cluster.members.length}곳 묶음, 확대해서 보기`);

  const count = document.createElement("span");
  count.dataset.count = "1";
  count.textContent = String(cluster.members.length);

  const unit = document.createElement("span");
  unit.dataset.unit = "1";
  unit.textContent = "곳";

  el.appendChild(count);
  el.appendChild(unit);

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  el.addEventListener("mouseenter", () => onHover(true));
  el.addEventListener("mouseleave", () => onHover(false));
  el.addEventListener("focus", () => onHover(true));
  el.addEventListener("blur", () => onHover(false));
  return el;
}

function styleCluster(el: HTMLButtonElement, cluster: Cluster, hovered: boolean) {
  const color = TIER_COLOR[cluster.tier];
  const total = cluster.members.length;
  const size = Math.round(Math.min(66, 40 + Math.log2(total + 1) * 6.5));
  const solid = cluster.tier !== "normal";

  Object.assign(el.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    cursor: "pointer",
    border: "2.5px solid #ffffff",
    // 안쪽은 티어 색, 바깥은 흰 테두리 + 반투명 후광으로 지도 위에서 뜨게 한다.
    background: solid
      ? `radial-gradient(circle at 50% 32%, ${color.bg} 0%, ${color.border} 100%)`
      : "linear-gradient(180deg, #ffffff 0%, var(--color-surface-muted) 100%)",
    color: solid ? color.fg : "var(--color-primary)",
    boxShadow: hovered
      ? `0 0 0 8px ${color.ring}, 0 10px 24px rgba(15,23,42,0.28)`
      : `0 0 0 5px ${color.ring}, 0 4px 14px rgba(15,23,42,0.2)`,
    transform: hovered ? "scale(1.1)" : "scale(1)",
    transition: "transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s ease",
    zIndex: solid ? "12" : "2",
  } as CSSStyleDeclaration);

  const count = el.querySelector<HTMLElement>('[data-count="1"]');
  if (count) {
    Object.assign(count.style, {
      fontSize: `${Math.max(13, Math.round(size * 0.34))}px`,
      fontWeight: "800",
      lineHeight: "1",
      letterSpacing: "-0.02em",
    } as CSSStyleDeclaration);
  }
  const unit = el.querySelector<HTMLElement>('[data-unit="1"]');
  if (unit) {
    Object.assign(unit.style, {
      fontSize: "9px",
      fontWeight: "700",
      lineHeight: "1",
      marginTop: "2px",
      opacity: solid ? "0.85" : "0.7",
    } as CSSStyleDeclaration);
  }
  // 테두리가 배경색을 뚫지 않도록 안쪽 링을 별도로 그린다.
  el.style.outline = `1px solid ${solid ? color.border : "var(--color-border)"}`;
  el.style.outlineOffset = "-2.5px";
}

/**
 * 인프라 핀 — 전용 마커 아이콘 + 짧은 분류 라벨.
 * 시설 이름까지 넣으면 핀이 가로로 길어져 지도를 가리므로, 이름은 title/aria-label 로만 남긴다.
 * 2순위(취향)는 아이콘만 찍어 더 가볍게 보이게 한다.
 */
function buildInfraPin(poi: MapInfraPoi): HTMLDivElement {
  const color = INFRA_COLOR[poi.tier];
  const emphasized = poi.tier !== "preference";
  const el = document.createElement("div");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `${poi.categoryLabel} ${poi.label}, ${poi.distance}m`);
  el.title = `${poi.categoryLabel} · ${poi.label} · ${poi.distance}m`;

  const img = document.createElement("img");
  img.src = INFRA_MARKER_ICON[poi.tier];
  img.alt = "";
  Object.assign(img.style, {
    width: emphasized ? "16px" : "15px",
    height: emphasized ? "16px" : "15px",
    objectFit: "contain",
    flexShrink: "0",
  } as CSSStyleDeclaration);
  el.appendChild(img);

  if (emphasized) {
    const label = document.createElement("span");
    label.textContent = poi.categoryLabel;
    el.appendChild(label);
  }

  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    padding: emphasized ? "2px 7px 2px 3px" : "2px",
    borderRadius: "9999px",
    fontSize: "10px",
    fontWeight: "700",
    lineHeight: "1.1",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    border: "1px solid",
    borderColor: color.border,
    background: color.bg,
    color: color.fg,
    boxShadow: emphasized ? "0 2px 8px rgba(15,23,42,0.2)" : "0 1px 4px rgba(15,23,42,0.14)",
  } as CSSStyleDeclaration);
  return el;
}

export function KakaoMapView({
  markers,
  selectedId,
  onSelect,
  ariaLabel = "주택 위치 지도",
  onViewportChange,
  fullBleed = false,
  infra = [],
  onHoverChange,
  hoveredId = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<{ key: string; cluster: Cluster; overlay: any; el: HTMLButtonElement }[]>([]);
  const infraOverlaysRef = useRef<any[]>([]);
  const onSelectRef = useRef(onSelect);
  const onHoverChangeRef = useRef(onHoverChange);
  const onViewportChangeRef = useRef(onViewportChange);
  const markersRef = useRef<MapMarker[]>(markers);
  const didInitialFitRef = useRef(false);
  const [failed, setFailed] = useState(!KAKAO_KEY);
  const [ready, setReady] = useState(false);
  /** 줌·이동이 끝날 때마다 올려 클러스터를 다시 계산한다. */
  const [viewTick, setViewTick] = useState(0);
  const [innerHovered, setInnerHovered] = useState<string | null>(null);

  const focusedId = hoveredId ?? innerHovered;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onHoverChangeRef.current = onHoverChange;
  }, [onHoverChange]);

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

  /** 클러스터를 눌렀을 때 그 지점을 기준으로 부드럽게 단계 확대한다.
   *  격자 클러스터링이 화면 픽셀 기준이라, 확대할수록 묶음이 알아서 풀린다.
   *  (setBounds 로 한 번에 맞추면 여전히 겹치는 레벨에 착지해 핀이 서로 가려진다.)
   *  anchor 를 클러스터 좌표로 주면 그 지점이 고정된 채 확대돼 별도 이동이 필요 없다. */
  const zoomToCluster = (cluster: Cluster) => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    const center = new kakao.maps.LatLng(cluster.coord.lat, cluster.coord.lng);
    const next = Math.max(1, map.getLevel() - CLUSTER_ZOOM_STEP);
    if (next === map.getLevel()) return;
    map.setLevel(next, { animate: { duration: 350 }, anchor: center });
  };

  const handleHover = (id: string | null) => {
    setInnerHovered(id);
    onHoverChangeRef.current?.(id);
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
        idleHandler = () => {
          reportViewport(mapRef.current);
          setViewTick((tick) => tick + 1);
        };
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

  // 마커 렌더 — markers/줌 변경 시 클러스터를 다시 계산해 재생성.
  useEffect(() => {
    const kakao = window.kakao;
    if (!ready || !kakao?.maps || !mapRef.current) return;
    markersRef.current = markers;
    overlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));

    const clusters = clusterMarkers(kakao, mapRef.current, markers, selectedId);
    overlaysRef.current = clusters.map((cluster) => {
      const isCluster = cluster.members.length > 1;
      const el = isCluster
        ? buildCluster(cluster, () => zoomToCluster(cluster), (hovering) => handleHover(hovering ? cluster.key : null))
        : buildPin(
            cluster.members[0],
            () => onSelectRef.current(cluster.members[0].id),
            (hovering) => handleHover(hovering ? cluster.members[0].id : null),
          );
      if (isCluster) styleCluster(el, cluster, false);
      else stylePin(el, cluster.tier, cluster.members[0].id === selectedId, false);

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(cluster.coord.lat, cluster.coord.lng),
        content: el,
        yAnchor: isCluster ? 0.5 : 1,
        zIndex: cluster.tier === "normal" ? 1 : 10,
      });
      overlay.setMap(mapRef.current);
      return { key: cluster.key, cluster, overlay, el };
    });

    if (!didInitialFitRef.current && markers.length > 0) {
      didInitialFitRef.current = true;
      requestAnimationFrame(() => fitAll());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, ready, viewTick]);

  // 선택·호버 강조 (재생성 없이 스타일만 토글)
  useEffect(() => {
    const kakao = window.kakao;
    if (!ready || !kakao?.maps || !mapRef.current) return;
    overlaysRef.current.forEach(({ key, cluster, overlay, el }) => {
      const hovered = key === focusedId;
      if (cluster.members.length > 1) {
        styleCluster(el, cluster, hovered);
        return;
      }
      const active = cluster.members[0].id === selectedId;
      stylePin(el, cluster.tier, active, hovered);
      overlay.setZIndex(active ? 30 : hovered ? 25 : cluster.tier === "normal" ? 1 : 10);
      if (active) mapRef.current.panTo(overlay.getPosition());
    });
  }, [selectedId, focusedId, ready, viewTick]);

  // 인프라 핀 — 마커를 선택했을 때만 그려진다.
  useEffect(() => {
    const kakao = window.kakao;
    if (!ready || !kakao?.maps || !mapRef.current) return;
    infraOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    infraOverlaysRef.current = infra.map((poi) => {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(poi.coord.lat, poi.coord.lng),
        content: buildInfraPin(poi),
        yAnchor: 0.5,
        zIndex: poi.tier === "preference" ? 3 : 6,
      });
      overlay.setMap(mapRef.current);
      return overlay;
    });
    return () => {
      infraOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      infraOverlaysRef.current = [];
    };
  }, [infra, ready]);

  if (failed) {
    return (
      <MockMapView
        markers={markers}
        selectedId={selectedId}
        onSelect={onSelect}
        ariaLabel={`${ariaLabel} (모의)`}
        onViewportChange={onViewportChange}
        fullBleed={fullBleed}
        infra={infra}
        onHoverChange={onHoverChange}
        hoveredId={hoveredId}
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
