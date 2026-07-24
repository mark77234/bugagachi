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
 *    - buld_CMSC_M_NM_counts.csv / _S_NM_counts.csv → storePercentile 분포 모집단
 */
import { haversineMeters, nearestMeters, type LatLng } from "@/lib/coordinates";
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

/** Q6 상권 밀집지(상가 클러스터) mock 좌표. */
export const COMMERCIAL_CLUSTERS: LatLng[] = [
  { lat: 35.1579, lng: 129.0594 }, // 서면
  { lat: 35.1631, lng: 129.1636 }, // 해운대
  { lat: 35.1533, lng: 129.1187 }, // 광안리
  { lat: 35.2295, lng: 129.0902 }, // 부산대
];

export function nearestInfraMeters(from: LatLng, category: InfraCategory): number {
  return nearestMeters(from, INFRA_POINTS[category]);
}
export function nearestEduMeters(from: LatLng, category: EduCategory): number {
  return nearestMeters(from, EDU_POINTS[category]);
}
export function nearestCommercialMeters(from: LatLng): number {
  return nearestMeters(from, COMMERCIAL_CLUSTERS);
}

/** Q5 취향 가게 백분위 mock.
 *  실제로는 반경 750m 내 업종 점포 개수를 부산 전 재고 분포로 백분위화한다.
 *  여기서는 (주택, 업종) 조합의 결정적 해시 → 0~1 백분위로 근사한다. */
export function storePercentile(unitId: string, chip: string): number {
  const key = `${unitId}::${chip}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000; // 0.000 ~ 0.999
}

export { haversineMeters };
