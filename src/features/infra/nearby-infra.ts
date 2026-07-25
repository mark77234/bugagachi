/**
 * 주택 건물별 주변 인프라 조회.
 *
 * 원본 인프라 데이터(16만 건)는 클라이언트로 보내지 않는다.
 * `scripts/build-nearby-infra.mjs` 가 건물 38곳 기준 근접 POI만 미리 추려둔
 * `data/nearby_infra.json` 을 읽어 쓴다. 거리는 EPSG:5186 직선거리 × 1.291(부산 우회계수) 보정거리(m).
 */
import nearbyInfraJson from "../../../data/nearby_infra.json";
import type { LatLng } from "@/lib/coordinates";
import type { EduCategory, InfraCategory } from "@/features/recommendation/recommendation.types";

/** 1순위 = 필수 인프라, 2순위 = 취향 가게, 교육 = 설문에서 자녀가 있을 때만. */
export type InfraTier = "required" | "preference" | "education";

export interface NearbyPoi {
  id: string;
  tier: InfraTier;
  /** required → InfraCategory, education → EduCategory, preference → 취향 칩 라벨 */
  category: string;
  name: string;
  /** 업종·종별 등 부가 설명 */
  detail?: string;
  coord: LatLng;
  /** 보정거리(m) */
  distance: number;
}

interface RawPoi {
  c: string;
  n: string;
  s?: string;
  lat: number;
  lng: number;
  d: number;
}
/** 공원 원주거리 특례 결과 (docs/score_logic.md §7). */
interface RawParkEdge {
  /** 원주까지의 보정거리(m) */
  d: number;
  /** 매듭 점수 0~1 */
  s: number;
  /** 최근접 공원 이름 */
  n: string;
  /** 등가반경(m) */
  r: number;
}

interface RawBuilding {
  parkEdge: RawParkEdge | null;
  required: RawPoi[];
  preference: RawPoi[];
  education: RawPoi[];
}

const BUILDINGS = (nearbyInfraJson as { buildings: Record<string, RawBuilding> }).buildings;

export const REQUIRED_LABEL: Record<InfraCategory, string> = {
  HOSPITAL: "종합병원",
  MART: "대형마트",
  PARK: "공원",
  LIBRARY: "공공도서관",
  SPORTS: "생활체육시설",
  SUBWAY: "지하철역",
};

export const EDUCATION_LABEL: Record<EduCategory, string> = {
  DAYCARE: "어린이집",
  KINDER: "유치원",
  ELEM: "초등학교",
  MIDDLE: "중학교",
  HIGH: "고등학교",
};

/** 카테고리 코드 → 사람이 읽는 라벨. 취향 칩은 코드가 곧 라벨이다. */
export function infraCategoryLabel(poi: NearbyPoi): string {
  if (poi.tier === "required") return REQUIRED_LABEL[poi.category as InfraCategory] ?? poi.category;
  if (poi.tier === "education") return EDUCATION_LABEL[poi.category as EduCategory] ?? poi.category;
  return poi.category;
}

/** 원본 업종명은 "피자; 햄버거; 샌드위치 및 유사 음식점업"처럼 길다. 첫 항목만 짧게 쓴다. */
function shortDetail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const head = value.split(";")[0].trim();
  return head.length > 14 ? `${head.slice(0, 14)}…` : head;
}

function toPoi(raw: RawPoi, tier: InfraTier, index: number): NearbyPoi {
  return {
    id: `${tier}-${raw.c}-${index}`,
    tier,
    category: raw.c,
    name: raw.n,
    detail: shortDetail(raw.s),
    coord: { lat: raw.lat, lng: raw.lng },
    distance: raw.d,
  };
}

export interface NearbyInfra {
  required: NearbyPoi[];
  preference: NearbyPoi[];
  education: NearbyPoi[];
}

const EMPTY: NearbyInfra = { required: [], preference: [], education: [] };

export interface ParkEdgeMetric {
  /** 공원 경계(등가원 원주)까지의 보정거리(m) */
  distance: number;
  score: number;
  parkName: string;
  /** 등가반경(m) — 0이면 사실상 점 좌표와 같다. */
  equivalentRadius: number;
}

/**
 * 공원 점수용 원주거리 지표.
 * 공원은 경계에 닿는 순간부터 이용이 시작되므로 중심점 거리 대신 등가원 원주까지의 거리를 쓴다.
 * (전처리에서 전 공원 거리행렬로 계산 — 최근접 공원이 중심점 기준과 달라질 수 있어 단일 최근접 조회로는 안 된다)
 */
export function parkEdgeMetricOf(unitId: string): ParkEdgeMetric | null {
  const raw = BUILDINGS[unitId]?.parkEdge;
  if (!raw) return null;
  return { distance: raw.d, score: raw.s, parkName: raw.n, equivalentRadius: raw.r };
}

/** 건물 id 로 사전계산된 주변 인프라 전체를 가져온다. 각 배열은 거리 오름차순. */
export function nearbyInfraOf(unitId: string): NearbyInfra {
  const raw = BUILDINGS[unitId];
  if (!raw) return EMPTY;
  return {
    required: raw.required.map((poi, index) => toPoi(poi, "required", index)),
    preference: raw.preference.map((poi, index) => toPoi(poi, "preference", index)),
    education: raw.education.map((poi, index) => toPoi(poi, "education", index)),
  };
}

/** 카테고리당 최대 n개만 남긴다(같은 업종이 목록을 독점하지 않도록). */
function capPerCategory(list: NearbyPoi[], perCategory: number): NearbyPoi[] {
  const seen = new Map<string, number>();
  const out: NearbyPoi[] = [];
  for (const poi of list) {
    const used = seen.get(poi.category) ?? 0;
    if (used >= perCategory) continue;
    seen.set(poi.category, used + 1);
    out.push(poi);
  }
  return out;
}

export interface InfraSelectOptions {
  /** 설문에서 돌봄·교육이 필요하다고 답했을 때만 교육 인프라를 포함한다. */
  includeEducation?: boolean;
  /** 총 개수 상한 */
  limit?: number;
}

/**
 * 지도에서 마커를 선택했을 때 함께 띄울 주변 인프라.
 *
 * 취향 가게(preference)는 건물 한 곳 주변에만 수백 곳이 몰려 마커가 지도를 덮어버리므로 찍지 않는다.
 * 필수 인프라와 (설문에서 필요하다고 답한 경우) 돌봄·교육만 보여주고, 취향 가게는 상세 페이지에서 확인한다.
 * 한 업종이 목록을 독점하지 않도록 카테고리당 개수를 제한한다.
 */
export function mapInfraFor(unitId: string, options: InfraSelectOptions = {}): NearbyPoi[] {
  const { includeEducation = false, limit = 40 } = options;
  const infra = nearbyInfraOf(unitId);

  const picked: NearbyPoi[] = [
    ...capPerCategory(infra.required, 2),
    ...(includeEducation ? capPerCategory(infra.education, 2) : []),
  ];

  return picked.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/** 상세 페이지 반경 구간. 가까운 것부터 단계별로 나눠 보여준다. */
export const RADIUS_BANDS = [
  { key: "walk5", label: "도보 5분", max: 400 },
  { key: "walk10", label: "도보 10분", max: 800 },
  { key: "walk20", label: "도보 20분", max: 1500 },
  { key: "near", label: "3km 이내", max: 3000 },
  { key: "far", label: "3km 밖", max: Infinity },
] as const;

export type RadiusBandKey = (typeof RADIUS_BANDS)[number]["key"];

export function bandOf(distance: number): RadiusBandKey {
  return (RADIUS_BANDS.find((band) => distance <= band.max) ?? RADIUS_BANDS[RADIUS_BANDS.length - 1]).key;
}

/**
 * 상세 페이지용 — 사전계산해 둔 주변 인프라를 그대로(가까운 순) 돌려준다.
 * 화면에서 반경 구간·카테고리로 나눠 보여주므로 여기서는 자르지 않는다.
 */
export function detailInfraFor(
  unitId: string,
  options: { includeEducation?: boolean } = {},
): NearbyInfra & { hasAny: boolean; all: NearbyPoi[] } {
  const infra = nearbyInfraOf(unitId);
  const education = options.includeEducation ? infra.education : [];
  const all = [...infra.required, ...education, ...infra.preference].sort((a, b) => a.distance - b.distance);
  return {
    required: infra.required,
    preference: infra.preference,
    education,
    all,
    hasAny: all.length > 0,
  };
}
