/** EPSG:5186 (KGD2002 / Central Belt 2010) 정·역 투영.
 *  정투영은 src/lib/coordinates.ts 와 동일한 공식이고, 역투영은 상가 데이터(EPSG:5186)를
 *  지도 표시용 WGS84로 되돌리기 위해 필요하다. */

const GRS80_A = 6_378_137;
const GRS80_F = 1 / 298.257222101;
const LAT_0 = 38;
const LON_0 = 127;
const K0 = 1;
const FALSE_EASTING = 200_000;
const FALSE_NORTHING = 500_000;

const E2 = GRS80_F * (2 - GRS80_F);
const EP2 = E2 / (1 - E2);

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

function meridionalArc(latRad) {
  const e4 = E2 ** 2;
  const e6 = E2 ** 3;
  return (
    GRS80_A *
    ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latRad -
      ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * latRad) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latRad) -
      ((35 * e6) / 3072) * Math.sin(6 * latRad))
  );
}

const M0 = meridionalArc(toRad(LAT_0));

/** WGS84 위경도 → EPSG:5186 */
export function toEpsg5186({ lat, lng }) {
  const latRad = toRad(lat);
  const lonRad = toRad(lng);
  const lon0 = toRad(LON_0);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);
  const n = GRS80_A / Math.sqrt(1 - E2 * sinLat ** 2);
  const t = tanLat ** 2;
  const c = EP2 * cosLat ** 2;
  const a = cosLat * (lonRad - lon0);
  const m = meridionalArc(latRad);

  const easting =
    FALSE_EASTING +
    K0 * n * (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t ** 2 + 72 * c - 58 * EP2) * a ** 5) / 120);
  const northing =
    FALSE_NORTHING +
    K0 *
      (m -
        M0 +
        n *
          tanLat *
          (a ** 2 / 2 +
            ((5 - t + 9 * c + 4 * c ** 2) * a ** 4) / 24 +
            ((61 - 58 * t + t ** 2 + 600 * c - 330 * EP2) * a ** 6) / 720));

  return { easting, northing };
}

/** EPSG:5186 → WGS84 위경도 (역 Transverse Mercator). */
export function fromEpsg5186({ easting, northing }) {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const x = easting - FALSE_EASTING;
  const m = M0 + (northing - FALSE_NORTHING) / K0;
  const mu = m / (GRS80_A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);
  const c1 = EP2 * cosPhi1 ** 2;
  const t1 = tanPhi1 ** 2;
  const n1 = GRS80_A / Math.sqrt(1 - E2 * sinPhi1 ** 2);
  const r1 = (GRS80_A * (1 - E2)) / (1 - E2 * sinPhi1 ** 2) ** 1.5;
  const d = x / (n1 * K0);

  const lat =
    phi1 -
    ((n1 * tanPhi1) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * EP2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * EP2 - 3 * c1 ** 2) * d ** 6) / 720);
  const lng =
    toRad(LON_0) +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * EP2 + 24 * t1 ** 2) * d ** 5) / 120) /
      cosPhi1;

  return { lat: toDeg(lat), lng: toDeg(lng) };
}

/** EPSG:5186 평면 직선거리(m). */
export function planarMeters(a, b) {
  return Math.hypot(a.easting - b.easting, a.northing - b.northing);
}

/** 원본 인프라 데이터(중부원점 TM)와 위 정투영 사이의 상수 보정값.
 *  required_infra/hospital.json 31행이 위경도와 평면좌표를 모두 갖고 있어 이를 기준으로 산출했다.
 *  (표준편차 0.1m — 부산 전역에서 상수 오프셋으로 확인됨) */
export const SOURCE_TM_OFFSET = { easting: 72.69, northing: 309.91 };

/** 원본 데이터의 평면좌표(x, y) → WGS84 위경도. */
export function sourceTmToLatLng(x, y) {
  return fromEpsg5186({ easting: x + SOURCE_TM_OFFSET.easting, northing: y + SOURCE_TM_OFFSET.northing });
}
