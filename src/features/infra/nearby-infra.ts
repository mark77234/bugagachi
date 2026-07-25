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
interface RawBuilding {
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
  /** 사용자가 선택한 취향 가게 칩. 있으면 해당 업종을 우선한다. */
  preferredChips?: string[];
  /** 총 개수 상한 */
  limit?: number;
}

/**
 * 지도에서 마커를 선택했을 때 함께 띄울 주변 인프라를 고른다.
 * 필수 인프라를 먼저 채우고(카테고리당 1곳), 교육 → 취향 순으로 남은 자리를 메운다.
 */
export function mapInfraFor(unitId: string, options: InfraSelectOptions = {}): NearbyPoi[] {
  const { includeEducation = false, preferredChips = [], limit = 10 } = options;
  const infra = nearbyInfraOf(unitId);

  // 1순위 — 카테고리당 가장 가까운 1곳
  const picked: NearbyPoi[] = capPerCategory(infra.required, 1);

  // 교육 — 자녀가 있다고 답한 경우에만, 카테고리당 1곳
  if (includeEducation) {
    picked.push(...capPerCategory(infra.education, 1).slice(0, 3));
  }

  // 2순위 — 선택한 칩을 앞에 두고 남은 자리를 채운다
  const chips = new Set(preferredChips);
  const preference = capPerCategory(
    [...infra.preference].sort((a, b) => {
      const rank = Number(chips.has(b.category)) - Number(chips.has(a.category));
      return rank !== 0 ? rank : a.distance - b.distance;
    }),
    1,
  );
  picked.push(...preference.slice(0, Math.max(0, limit - picked.length)));

  return picked.slice(0, limit).sort((a, b) => a.distance - b.distance);
}

/**
 * 상세 페이지용. 티어별로 개수를 제한해 돌려준다
 * (반경 안 점포가 수십 곳인 건물에서 목록이 폭주하지 않도록).
 */
export function detailInfraFor(
  unitId: string,
  options: { includeEducation?: boolean } = {},
): NearbyInfra & { hasAny: boolean } {
  const infra = nearbyInfraOf(unitId);
  // 카테고리당 1곳만 남기므로 총 개수는 필수 6 · 교육 5 · 취향 8 이하로 자연히 제한된다.
  // (거리순으로 자르면 먼 카테고리가 통째로 빠져 목록에서 사라지므로 자르지 않는다.)
  const required = capPerCategory(infra.required, 1);
  const preference = capPerCategory(infra.preference, 1).slice(0, 8);
  const education = options.includeEducation ? capPerCategory(infra.education, 1) : [];
  return {
    required,
    preference,
    education,
    hasAny: required.length + preference.length + education.length > 0,
  };
}
