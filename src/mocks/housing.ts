/** Mock 공공임대 주택 재고. 실제 데이터 진입 시 이 배열을 loader 결과로 교체. */
import type { LatLng } from "@/lib/coordinates";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export type RecruitStatus = "open" | "upcoming" | "closed";

export interface RentalCondition {
  priorityRank?: 1 | 2 | 3;
  deposit: number; // 만원
  monthlyRent: number; // 만원
}

export interface HousingUnit {
  id: string;
  name: string;
  type: EligibilityTypeCode;
  gungu: string;
  address: string;
  coord: LatLng;
  conditions: RentalCondition[]; // 순위별 임대조건(예산 보수 필터용)
  recruitStatus: RecruitStatus;
  recruitPeriod?: { start: string; end: string };
  supplyCount: number;
  exclusiveAreas: number[]; // ㎡
  officialUrl: string;
}

const OFFICIAL = "https://www.myhome.go.kr";

export const MOCK_HOUSING: HousingUnit[] = [
  {
    id: "h-001",
    name: "부산진 행복주택 1단지",
    type: "HAENGBOK",
    gungu: "부산진구",
    address: "부산광역시 부산진구 중앙대로 660",
    coord: { lat: 35.1621, lng: 129.0533 },
    conditions: [
      { priorityRank: 1, deposit: 3200, monthlyRent: 21 },
      { priorityRank: 2, deposit: 3600, monthlyRent: 25 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-10", end: "2026-08-05" },
    supplyCount: 120,
    exclusiveAreas: [16, 26, 36],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-002",
    name: "해운대 통합공공임대 스테이",
    type: "TONGHAP",
    gungu: "해운대구",
    address: "부산광역시 해운대구 좌동순환로 100",
    coord: { lat: 35.1687, lng: 129.1735 },
    conditions: [
      { priorityRank: 2, deposit: 5200, monthlyRent: 33 },
      { priorityRank: 3, deposit: 5800, monthlyRent: 38 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-01", end: "2026-07-31" },
    supplyCount: 210,
    exclusiveAreas: [26, 36, 46],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-003",
    name: "동래 매입임대 청년주택",
    type: "MAEIP_CHUNG",
    gungu: "동래구",
    address: "부산광역시 동래구 충렬대로 200",
    coord: { lat: 35.2041, lng: 129.0846 },
    conditions: [
      { priorityRank: 1, deposit: 900, monthlyRent: 12 },
      { priorityRank: 3, deposit: 1200, monthlyRent: 16 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-15", end: "2026-08-10" },
    supplyCount: 48,
    exclusiveAreas: [17, 24],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-004",
    name: "남구 재개발 임대아파트",
    type: "JAEGAEBAL",
    gungu: "남구",
    address: "부산광역시 남구 유엔평화로 50",
    coord: { lat: 35.1359, lng: 129.0843 },
    conditions: [{ priorityRank: 1, deposit: 4200, monthlyRent: 18 }],
    recruitStatus: "upcoming",
    recruitPeriod: { start: "2026-08-20", end: "2026-09-15" },
    supplyCount: 86,
    exclusiveAreas: [39, 49, 59],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-005",
    name: "사상 매입임대 일반",
    type: "MAEIP_ILBAN",
    gungu: "사상구",
    address: "부산광역시 사상구 학감대로 30",
    coord: { lat: 35.1524, lng: 128.9912 },
    conditions: [
      { priorityRank: 1, deposit: 1500, monthlyRent: 14 },
      { priorityRank: 2, deposit: 1800, monthlyRent: 17 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-05", end: "2026-07-28" },
    supplyCount: 64,
    exclusiveAreas: [29, 39],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-006",
    name: "연제 통합공공임대 뉴스테이",
    type: "TONGHAP",
    gungu: "연제구",
    address: "부산광역시 연제구 중앙대로 1000",
    coord: { lat: 35.1761, lng: 129.0792 },
    conditions: [
      { priorityRank: 2, deposit: 4600, monthlyRent: 29 },
      { priorityRank: 3, deposit: 5000, monthlyRent: 34 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-12", end: "2026-08-08" },
    supplyCount: 150,
    exclusiveAreas: [26, 36, 46],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-007",
    name: "금정 행복주택 대학타운",
    type: "HAENGBOK",
    gungu: "금정구",
    address: "부산광역시 금정구 부산대학로 63",
    coord: { lat: 35.2312, lng: 129.0844 },
    conditions: [{ priorityRank: 1, deposit: 2100, monthlyRent: 15 }],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-18", end: "2026-08-12" },
    supplyCount: 96,
    exclusiveAreas: [16, 21],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-008",
    name: "수영 매입임대 청년하우스",
    type: "MAEIP_CHUNG",
    gungu: "수영구",
    address: "부산광역시 수영구 광안해변로 250",
    coord: { lat: 35.1533, lng: 129.1187 },
    conditions: [
      { priorityRank: 1, deposit: 1000, monthlyRent: 13 },
      { priorityRank: 2, deposit: 1400, monthlyRent: 18 },
    ],
    recruitStatus: "closed",
    recruitPeriod: { start: "2026-05-01", end: "2026-05-28" },
    supplyCount: 40,
    exclusiveAreas: [17, 23],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-009",
    name: "북구 통합공공임대 家",
    type: "TONGHAP",
    gungu: "북구",
    address: "부산광역시 북구 금곡대로 300",
    coord: { lat: 35.1974, lng: 128.9905 },
    conditions: [
      { priorityRank: 2, deposit: 3800, monthlyRent: 24 },
      { priorityRank: 3, deposit: 4200, monthlyRent: 28 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-08", end: "2026-08-02" },
    supplyCount: 130,
    exclusiveAreas: [26, 36],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-010",
    name: "해운대 매입임대 일반",
    type: "MAEIP_ILBAN",
    gungu: "해운대구",
    address: "부산광역시 해운대구 반송로 400",
    coord: { lat: 35.2201, lng: 129.1408 },
    conditions: [
      { priorityRank: 1, deposit: 1700, monthlyRent: 15 },
      { priorityRank: 2, deposit: 2100, monthlyRent: 19 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-20", end: "2026-08-14" },
    supplyCount: 72,
    exclusiveAreas: [29, 39, 49],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-011",
    name: "동구 행복주택 역세권",
    type: "HAENGBOK",
    gungu: "동구",
    address: "부산광역시 동구 중앙대로 200",
    coord: { lat: 35.1291, lng: 129.0451 },
    conditions: [
      { priorityRank: 1, deposit: 2800, monthlyRent: 19 },
      { priorityRank: 2, deposit: 3200, monthlyRent: 23 },
    ],
    recruitStatus: "open",
    recruitPeriod: { start: "2026-07-14", end: "2026-08-09" },
    supplyCount: 88,
    exclusiveAreas: [16, 26, 36],
    officialUrl: OFFICIAL,
  },
  {
    id: "h-012",
    name: "사하 재개발 임대",
    type: "JAEGAEBAL",
    gungu: "사하구",
    address: "부산광역시 사하구 낙동대로 150",
    coord: { lat: 35.1046, lng: 128.9748 },
    conditions: [{ priorityRank: 1, deposit: 3600, monthlyRent: 16 }],
    recruitStatus: "upcoming",
    recruitPeriod: { start: "2026-09-01", end: "2026-09-26" },
    supplyCount: 60,
    exclusiveAreas: [39, 49],
    officialUrl: OFFICIAL,
  },
];

export const housingById = (id: string) => MOCK_HOUSING.find((h) => h.id === id);

/** 예산 보수 필터용: 순위 불명확 시 가장 비싼(2·3순위 등) 조건. */
export function conservativeCondition(unit: HousingUnit): RentalCondition {
  return unit.conditions.reduce((worst, c) =>
    c.deposit + c.monthlyRent * 100 > worst.deposit + worst.monthlyRent * 100 ? c : worst,
  );
}

/** 표시용 대표(가장 저렴한) 조건. */
export function bestCondition(unit: HousingUnit): RentalCondition {
  return unit.conditions.reduce((best, c) =>
    c.deposit + c.monthlyRent * 100 < best.deposit + best.monthlyRent * 100 ? c : best,
  );
}
