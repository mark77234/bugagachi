/** 좌표·거리 유틸.
 *  추천 점수용 거리는 WGS84를 EPSG:5186으로 투영한 유클리드 거리 × 1.291을 사용한다.
 *  지도 표시 좌표는 기존 WGS84를 유지한다. */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Epsg5186Point {
  easting: number;
  northing: number;
}

/** 부산 평균 우회계수 (도로거리/직선거리). 출처: 우회계수 산정 리포트. */
export const BUSAN_DETOUR_FACTOR = 1.291;

const EARTH_RADIUS_M = 6_371_000;
const GRS80_A = 6_378_137;
const GRS80_F = 1 / 298.257222101;
const EPSG_5186_LAT_0 = 38;
const EPSG_5186_LON_0 = 127;
const EPSG_5186_K0 = 1;
const EPSG_5186_FALSE_EASTING = 200_000;
const EPSG_5186_FALSE_NORTHING = 600_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function meridionalArc(latRad: number, eccentricitySquared: number): number {
  const e4 = eccentricitySquared ** 2;
  const e6 = eccentricitySquared ** 3;
  return (
    GRS80_A *
    ((1 - eccentricitySquared / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latRad -
      ((3 * eccentricitySquared) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latRad) -
      ((35 * e6) / 3072) * Math.sin(6 * latRad))
  );
}

/** WGS84/KGD2002 위경도 → EPSG:5186(KGD2002 / Central Belt 2010).
 *  EPSG 공식 파라미터: GRS80, lat_0=38, lon_0=127, k=1, x_0=200000, y_0=600000. */
export function toEpsg5186(point: LatLng): Epsg5186Point {
  const lat = toRad(point.lat);
  const lon = toRad(point.lng);
  const lat0 = toRad(EPSG_5186_LAT_0);
  const lon0 = toRad(EPSG_5186_LON_0);
  const e2 = GRS80_F * (2 - GRS80_F);
  const ep2 = e2 / (1 - e2);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);
  const n = GRS80_A / Math.sqrt(1 - e2 * sinLat ** 2);
  const t = tanLat ** 2;
  const c = ep2 * cosLat ** 2;
  const a = cosLat * (lon - lon0);
  const m = meridionalArc(lat, e2);
  const m0 = meridionalArc(lat0, e2);

  const easting =
    EPSG_5186_FALSE_EASTING +
    EPSG_5186_K0 *
      n *
      (a +
        ((1 - t + c) * a ** 3) / 6 +
        ((5 - 18 * t + t ** 2 + 72 * c - 58 * ep2) * a ** 5) / 120);
  const northing =
    EPSG_5186_FALSE_NORTHING +
    EPSG_5186_K0 *
      (m -
        m0 +
        n *
          tanLat *
          (a ** 2 / 2 +
            ((5 - t + 9 * c + 4 * c ** 2) * a ** 4) / 24 +
            ((61 - 58 * t + t ** 2 + 600 * c - 330 * ep2) * a ** 6) / 720));

  return { easting, northing };
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

/** EPSG:5186 평면 직선거리(m). */
export function projectedMeters(a: LatLng, b: LatLng): number {
  const pa = toEpsg5186(a);
  const pb = toEpsg5186(b);
  return Math.hypot(pa.easting - pb.easting, pa.northing - pb.northing);
}

/** EPSG:5186 직선거리에 부산 우회계수를 적용한 보정거리(m). */
export function boostedMeters(a: LatLng, b: LatLng): number {
  return projectedMeters(a, b) * BUSAN_DETOUR_FACTOR;
}

/** 후보 목록에서 가장 가까운 EPSG:5186 직선거리(m). 비어있으면 Infinity. */
export function nearestMeters(from: LatLng, targets: LatLng[]): number {
  let min = Infinity;
  for (const t of targets) {
    const d = projectedMeters(from, t);
    if (d < min) min = d;
  }
  return min;
}

/** 후보 목록에서 가장 가까운 보정거리(m). 비어있으면 Infinity. */
export function nearestBoostedMeters(from: LatLng, targets: LatLng[]): number {
  const nearest = nearestMeters(from, targets);
  return Number.isFinite(nearest) ? nearest * BUSAN_DETOUR_FACTOR : nearest;
}
