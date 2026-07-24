/** 좌표·거리 유틸.
 *  현재는 WGS84 위경도 + Haversine 직선거리 × 부산 평균 우회계수(1.291).
 *  실제 CSV 좌표계(TM/KATECH 등) 변환은 추후 services/geo adapter에서 흡수한다. */

export interface LatLng {
  lat: number;
  lng: number;
}

/** 부산 평균 우회계수 (도로거리/직선거리). 출처: 우회계수 산정 리포트. */
export const BUSAN_DETOUR_FACTOR = 1.291;

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 두 좌표 사이 직선거리(m). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 직선거리에 부산 우회계수를 적용한 보정거리(m). */
export function boostedMeters(a: LatLng, b: LatLng): number {
  return haversineMeters(a, b) * BUSAN_DETOUR_FACTOR;
}

/** 후보 목록에서 가장 가까운 지점까지의 거리(m). 비어있으면 Infinity. */
export function nearestMeters(from: LatLng, targets: LatLng[]): number {
  let min = Infinity;
  for (const t of targets) {
    const d = haversineMeters(from, t);
    if (d < min) min = d;
  }
  return min;
}
