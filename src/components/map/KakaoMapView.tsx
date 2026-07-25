/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import {
  MockMapView,
  MAP_MARKER_ICON,
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
    width: "18px", height: "24px", overflow: "hidden", flexShrink: "0",
  } as CSSStyleDeclaration);
  const img = document.createElement("img");
  img.src = MAP_MARKER_ICON;
  img.alt = "";
  Object.assign(img.style, { width: "18px", height: "24px", objectFit: "contain" } as CSSStyleDeclaration);
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
  const focused = active || hovered;
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
    transform: focused ? `translateY(-6px) scale(${active ? 1.12 : 1.07})` : "translateY(-6px)",
    border: "1.5px solid",
    boxShadow: focused ? `0 8px 20px ${color.ring}` : "0 2px 6px rgba(15,23,42,0.18)",
    outline: hovered && !active ? `2px solid ${color.border}` : "none",
    outlineOffset: "2px",
    transition: "transform .15s ease, box-shadow .15s ease",
    borderColor: color.border,
    background: color.bg,
    color: color.fg,
    zIndex: active ? "30" : hovered ? "25" : tier === "normal" ? "1" : "10",
  } as CSSStyleDeclaration);
  const badge = el.querySelector<HTMLElement>('[data-badge="1"]');
  if (badge) {
    const onColor = tier !== "normal";
    badge.style.background = onColor ? "rgba(255,255,255,0.25)" : "var(--color-primary-subtle)";
    badge.style.color = onColor ? "#ffffff" : "var(--color-primary)";
  }
}

/** 클러스터 버블 — 묶인 개수를 원형으로 표시하고, 누르면 그 영역으로 확대한다. */
function buildCluster(cluster: Cluster, onClick: () => void, onHover: (hovering: boolean) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = String(cluster.members.length);
  el.setAttribute("aria-label", `주택 ${cluster.members.length}곳 묶음, 확대해서 보기`);
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
  const size = Math.min(58, 36 + Math.log2(cluster.members.length + 1) * 7);
  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    fontSize: "13px",
    fontWeight: "800",
    cursor: "pointer",
    border: "2px solid",
    borderColor: color.border,
    background: cluster.tier === "normal" ? "var(--color-surface)" : color.bg,
    color: cluster.tier === "normal" ? "var(--color-primary)" : color.fg,
    boxShadow: hovered ? `0 0 0 6px ${color.ring}` : `0 0 0 4px ${color.ring}`,
    transform: hovered ? "scale(1.08)" : "scale(1)",
    transition: "transform .15s ease, box-shadow .15s ease",
    zIndex: cluster.tier === "normal" ? "2" : "12",
  } as CSSStyleDeclaration);
}

/** 인프라 핀 — 1순위는 진한 색·큰 글씨, 2순위는 옅게. */
function buildInfraPin(poi: MapInfraPoi): HTMLDivElement {
  const color = INFRA_COLOR[poi.tier];
  const emphasized = poi.tier !== "preference";
  const el = document.createElement("div");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `${poi.categoryLabel} ${poi.label}, ${poi.distance}m`);
  el.textContent = emphasized ? `${poi.categoryLabel} · ${poi.label}` : poi.categoryLabel;
  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    padding: emphasized ? "3px 8px" : "2px 6px",
    borderRadius: "9999px",
    fontSize: emphasized ? "11px" : "10px",
    fontWeight: emphasized ? "700" : "600",
    lineHeight: "1.1",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    border: "1px solid",
    borderColor: color.border,
    background: color.bg,
    color: color.fg,
    opacity: emphasized ? "1" : "0.9",
    boxShadow: emphasized ? "0 2px 8px rgba(15,23,42,0.22)" : "0 1px 4px rgba(15,23,42,0.14)",
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

  /** 클러스터를 눌렀을 때 그 지점을 중심으로 단계적으로 확대한다.
   *  격자 클러스터링이 화면 픽셀 기준이라, 확대할수록 묶음이 알아서 풀린다.
   *  (setBounds 로 한 번에 맞추면 여전히 겹치는 레벨에 착지해 핀이 서로 가려진다.) */
  const zoomToCluster = (cluster: Cluster) => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    const center = new kakao.maps.LatLng(cluster.coord.lat, cluster.coord.lng);
    map.setCenter(center);
    map.setLevel(Math.max(1, map.getLevel() - CLUSTER_ZOOM_STEP));
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
