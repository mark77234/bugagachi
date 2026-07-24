/** Mock 시설 데이터 + 최근접 거리·백분위 조회.
 *  실제 CSV/XLS(지하철·병원·공원·대규모점포·체육·도서관·어린이집·상가) 파싱은 미구현.
 *  진입 타입·위치만 정의: services/facilities loader가 이 형태를 반환하도록 교체한다.
 *    - 부산 지하철 주소 위경도 매핑.csv        → INFRA_POINTS.SUBWAY
 *    - 건강_병원_부산광역시.csv                 → INFRA_POINTS.HOSPITAL
 *    - 부산광역시_15분 도시공원_20251119.csv    → INFRA_POINTS.PARK
 *    - 생활_대규모점포_부산광역시.csv           → INFRA_POINTS.MART
 *    - 부산_체육시설_위치정보.csv               → INFRA_POINTS.SPORTS
 *    - 부산 유초중고 도서관.csv                 → INFRA_POINTS.LIBRARY / EDU_POINTS.*
 *    - 부산 어린이집.xls                        → EDU_POINTS.DAYCARE
 *    - buld_CMSC_M_NM_counts.csv / _S_NM_counts.csv → 건물별 750m 점포수·상권 백분위
 */
import { nearestBoostedMeters, type LatLng } from "@/lib/coordinates";
import type { EduCategory, InfraCategory } from "@/features/recommendation/recommendation.types";

/** 구·군 center 근처로 흩뿌린 mock 시설 좌표. */
export const INFRA_POINTS: Record<InfraCategory, LatLng[]> = {
  HOSPITAL: [
    { lat: 35.1215, lng: 129.0343 }, // 부산대병원(서구)
    { lat: 35.1798, lng: 129.0752 }, // 연제
    { lat: 35.2311, lng: 129.0838 }, // 금정
    { lat: 35.163, lng: 129.161 }, // 해운대
  ],
  MART: [
    { lat: 35.1585, lng: 129.0596 },
    { lat: 35.1668, lng: 129.1721 },
    { lat: 35.2038, lng: 129.0791 },
    { lat: 35.1042, lng: 128.9755 },
    { lat: 35.1972, lng: 128.9928 },
  ],
  PARK: [
    { lat: 35.1595, lng: 129.0605 },
    { lat: 35.1698, lng: 129.16 },
    { lat: 35.2296, lng: 129.0862 },
    { lat: 35.1348, lng: 129.0865 },
    { lat: 35.153, lng: 129.1178 },
  ],
  LIBRARY: [
    { lat: 35.163, lng: 129.053 },
    { lat: 35.2045, lng: 129.0855 },
    { lat: 35.1305, lng: 129.0462 },
    { lat: 35.1975, lng: 128.9915 },
  ],
  SPORTS: [
    { lat: 35.19, lng: 129.06 },
    { lat: 35.167, lng: 129.129 },
    { lat: 35.204, lng: 129.083 },
    { lat: 35.105, lng: 128.978 },
  ],
  SUBWAY: [
    { lat: 35.1579, lng: 129.0594 }, // 서면
    { lat: 35.1798, lng: 129.0748 }, // 연산
    { lat: 35.1631, lng: 129.1636 }, // 해운대
    { lat: 35.2295, lng: 129.0902 }, // 부산대
    { lat: 35.1046, lng: 128.9749 }, // 하단
    { lat: 35.129, lng: 129.045 }, // 부산진
  ],
};

export const EDU_POINTS: Record<EduCategory, LatLng[]> = {
  DAYCARE: [
    { lat: 35.1625, lng: 129.0545 },
    { lat: 35.169, lng: 129.172 },
    { lat: 35.2035, lng: 129.0852 },
    { lat: 35.1298, lng: 129.0458 },
    { lat: 35.1528, lng: 129.1182 },
  ],
  KINDER: [
    { lat: 35.161, lng: 129.056 },
    { lat: 35.167, lng: 129.169 },
    { lat: 35.205, lng: 129.086 },
    { lat: 35.104, lng: 128.976 },
  ],
  ELEM: [
    { lat: 35.1635, lng: 129.0525 },
    { lat: 35.1665, lng: 129.1705 },
    { lat: 35.2042, lng: 129.0848 },
    { lat: 35.1305, lng: 129.0448 },
    { lat: 35.1975, lng: 128.9908 },
  ],
  MIDDLE: [
    { lat: 35.16, lng: 129.05 },
    { lat: 35.168, lng: 129.166 },
    { lat: 35.206, lng: 129.088 },
  ],
  HIGH: [
    { lat: 35.159, lng: 129.048 },
    { lat: 35.17, lng: 129.16 },
    { lat: 35.208, lng: 129.09 },
  ],
};

export function nearestInfraMeters(from: LatLng, category: InfraCategory): number {
  return nearestBoostedMeters(from, INFRA_POINTS[category]);
}
export function nearestEduMeters(from: LatLng, category: EduCategory): number {
  return nearestBoostedMeters(from, EDU_POINTS[category]);
}

const STORE_CATEGORIES = [
  "카페",
  "편의점",
  "헬스장",
  "빨래방",
  "동물병원",
  "스터디카페",
  "밥집",
  "베이커리",
  "미용실",
  "약국",
] as const;

type StoreCategory = (typeof STORE_CATEGORIES)[number];

/** 현재 12개 데모 건물의 반경 750m 업종별 점포수 사전계산본.
 *  동일 건물의 여러 호실은 반드시 같은 행을 공유하며, 백분위 모집단도 이 건물 행만 사용한다.
 *  실제 상가 전처리 파일을 연결할 때 이 어댑터의 반환 형태를 유지한다. */
const STORE_COUNTS_BY_BUILDING: Record<string, readonly number[]> = {
  "h-001": [46, 18, 9, 5, 3, 8, 112, 16, 28, 14],
  "h-002": [61, 22, 14, 4, 5, 10, 138, 21, 31, 18],
  "h-003": [35, 15, 8, 7, 4, 6, 86, 12, 24, 13],
  "h-004": [18, 9, 4, 3, 2, 2, 54, 8, 17, 7],
  "h-005": [22, 13, 6, 8, 2, 3, 69, 9, 21, 9],
  "h-006": [42, 19, 11, 6, 4, 7, 101, 15, 27, 15],
  "h-007": [54, 17, 12, 5, 3, 15, 93, 13, 25, 12],
  "h-008": [73, 24, 16, 5, 6, 12, 151, 25, 36, 19],
  "h-009": [16, 10, 5, 6, 2, 2, 48, 7, 18, 8],
  "h-010": [20, 11, 6, 5, 3, 3, 58, 8, 20, 9],
  "h-011": [39, 16, 7, 4, 3, 5, 96, 14, 23, 13],
  "h-012": [12, 8, 3, 4, 1, 1, 41, 5, 14, 6],
};

/** 소음업종 구성비 사전계산본(노래방·주점 등 / 전체 상가). */
const NOISE_RATIO_BY_BUILDING: Record<string, number> = {
  "h-001": 0.14,
  "h-002": 0.18,
  "h-003": 0.1,
  "h-004": 0.07,
  "h-005": 0.11,
  "h-006": 0.13,
  "h-007": 0.16,
  "h-008": 0.22,
  "h-009": 0.06,
  "h-010": 0.08,
  "h-011": 0.12,
  "h-012": 0.05,
};

function midrankPercentile(value: number, population: number[]): number {
  if (population.length <= 1) return 1;
  const less = population.filter((candidate) => candidate < value).length;
  const equal = population.filter((candidate) => candidate === value).length;
  return (less + (equal - 1) / 2) / (population.length - 1);
}

function categoryIndex(chip: string): number {
  return STORE_CATEGORIES.indexOf(chip as StoreCategory);
}

export function storeDensity(
  buildingId: string,
  chip: string,
): { count: number; percentile: number } | null {
  const index = categoryIndex(chip);
  const row = STORE_COUNTS_BY_BUILDING[buildingId];
  if (index < 0 || !row) return null;
  const population = Object.values(STORE_COUNTS_BY_BUILDING).map((counts) => counts[index]);
  return { count: row[index], percentile: midrankPercentile(row[index], population) };
}

export function neighborhoodProfile(
  buildingId: string,
): { bustlePercentile: number; noisePercentile: number; storeCount: number; noiseRatio: number } | null {
  const row = STORE_COUNTS_BY_BUILDING[buildingId];
  const noiseRatio = NOISE_RATIO_BY_BUILDING[buildingId];
  if (!row || noiseRatio === undefined) return null;
  const storeCount = row.reduce((sum, count) => sum + count, 0);
  const storePopulation = Object.values(STORE_COUNTS_BY_BUILDING).map((counts) =>
    counts.reduce((sum, count) => sum + count, 0),
  );
  const noisePopulation = Object.values(NOISE_RATIO_BY_BUILDING);
  return {
    bustlePercentile: midrankPercentile(storeCount, storePopulation),
    noisePercentile: midrankPercentile(noiseRatio, noisePopulation),
    storeCount,
    noiseRatio,
  };
}
