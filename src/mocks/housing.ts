/**
 * 부산 공공임대 주택 재고 어댑터.
 *
 * 원본 `data/busan_rental_scores.json`은 1행이 1호실이다. 화면과 지도에서는
 * 동일 주소를 한 건물로 묶고, 추천 예산 필터는 건물 안의 개별 호실 조건으로
 * 처리한다. 원본 행은 `sourceRows`에 그대로 보존해 모든 JSON 필드에 접근할 수 있다.
 */
import rentalScoreJson from "../../data/busan_rental_scores.json";
import type { LatLng } from "@/lib/coordinates";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export type RecruitStatus = "open" | "upcoming" | "closed" | "unknown";

export interface RentalScoreRow {
  [key: string]: string | number | null;
  rental_type: string | null;
  complex_name: string | null;
  district: string | null;
  address: string | null;
  address_norm: string | null;
  house_type: string | null;
  building_form: string | null;
  completion_year: number | null;
  unit_type: string | null;
  area_exclusive_m2: number | null;
  room_count: number | null;
  household_count: number | null;
  unit_count: number | null;
  elevator: string | null;
  parking_count: number | null;
  heating_type: string | null;
  eligibility_summary: string | null;
  supply_class: string | null;
  income_bracket: string | null;
  household_size: string | number | null;
  protection_type: string | null;
  unit_no: string | number | null;
  priority_rank: number | null;
  deposit_krw: number | null;
  rent_krw: number | null;
  lat: number | null;
  lon: number | null;
  geocode_precision: string | null;
  geocode_shift_m: number | null;
  pnu: string | number | null;
  anchor_lat: number | null;
  anchor_lon: number | null;
  anchor_dist_m: number | null;
  anchor_score: number | null;
  hospital_dist_m: number | null;
  hospital_score: number | null;
  library_dist_m: number | null;
  library_score: number | null;
  mart_dist_m: number | null;
  mart_score: number | null;
  park_dist_m: number | null;
  park_score: number | null;
  sports_dist_m: number | null;
  sports_score: number | null;
  subway_dist_m: number | null;
  subway_score: number | null;
  daycare_dist_m: number | null;
  daycare_score: number | null;
  kindergarten_dist_m: number | null;
  kindergarten_score: number | null;
  elementary_dist_m: number | null;
  elementary_score: number | null;
  middle_school_dist_m: number | null;
  middle_school_score: number | null;
  high_school_dist_m: number | null;
  high_school_score: number | null;
  cafe_cnt_750m: number | null;
  cafe_score: number | null;
  convenience_cnt_750m: number | null;
  convenience_score: number | null;
  gym_cnt_750m: number | null;
  gym_score: number | null;
  laundry_cnt_750m: number | null;
  laundry_score: number | null;
  vet_cnt_750m: number | null;
  vet_score: number | null;
  study_cafe_cnt_750m: number | null;
  study_cafe_score: number | null;
  restaurant_cnt_750m: number | null;
  restaurant_score: number | null;
  bakery_cnt_750m: number | null;
  bakery_score: number | null;
  hair_salon_cnt_750m: number | null;
  hair_salon_score: number | null;
  pharmacy_cnt_750m: number | null;
  pharmacy_score: number | null;
  store_total_750m: number | null;
  noise_store_750m: number | null;
  noise_ratio: number | null;
  bustle_pct: number | null;
  noise_pct: number | null;
  vibe_t: number | null;
  vibe_score: number | null;
}

export interface RentalCondition {
  priorityRank?: 1 | 2 | 3;
  deposit: number; // 만원
  monthlyRent: number; // 만원
  unitNo?: string;
  exclusiveArea?: number;
  roomCount?: number;
}

export interface HousingMetric {
  distance: number;
  score: number;
}

export interface StoreMetric {
  count: number;
  score: number;
}

export interface HousingSourceData {
  sourceRows: RentalScoreRow[];
  sourceRowCount: number;
  pricedUnitCount: number;
  houseType: string | null;
  buildingForm: string | null;
  completionYear: number | null;
  elevator: string | null;
  parkingCount: number | null;
  heatingType: string | null;
  eligibilitySummary: string | null;
  geocodePrecision: string | null;
  geocodeShiftM: number | null;
  infra: {
    hospital: HousingMetric | null;
    library: HousingMetric | null;
    mart: HousingMetric | null;
    park: HousingMetric | null;
    sports: HousingMetric | null;
    subway: HousingMetric | null;
  };
  education: {
    daycare: HousingMetric | null;
    kindergarten: HousingMetric | null;
    elementary: HousingMetric | null;
    middle: HousingMetric | null;
    high: HousingMetric | null;
  };
  stores: Record<string, StoreMetric | null>;
  neighborhood: {
    storeTotal: number;
    noiseStoreCount: number;
    noiseRatio: number;
    bustlePercentile: number;
    noisePercentile: number;
  } | null;
}

export interface HousingUnit {
  id: string;
  name: string;
  type: EligibilityTypeCode;
  gungu: string;
  address: string;
  coord: LatLng;
  conditions: RentalCondition[];
  recruitStatus: RecruitStatus;
  recruitPeriod?: { start: string; end: string };
  supplyCount: number;
  exclusiveAreas: number[];
  officialUrl: string;
  source: HousingSourceData;
}

export const RENTAL_DATASET_STATS = {
  sourceRows: (rentalScoreJson as unknown[]).length,
  validRows: 0,
  ignoredEmptyRows: 0,
  buildings: 0,
} as {
  sourceRows: number;
  validRows: number;
  ignoredEmptyRows: number;
  buildings: number;
};

const OFFICIAL = "https://www.myhome.go.kr";
const rawRows = rentalScoreJson as unknown as RentalScoreRow[];
const validRows = rawRows.filter(
  (row) =>
    row.address_norm &&
    row.address &&
    row.district &&
    typeof row.lat === "number" &&
    typeof row.lon === "number",
);

RENTAL_DATASET_STATS.validRows = validRows.length;
RENTAL_DATASET_STATS.ignoredEmptyRows = rawRows.length - validRows.length;

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `rental-${(hash >>> 0).toString(36)}`;
}

function metric(distance: number | null, score: number | null): HousingMetric | null {
  return typeof distance === "number" && typeof score === "number" ? { distance, score } : null;
}

function storeMetric(count: number | null, score: number | null): StoreMetric | null {
  return typeof count === "number" && typeof score === "number" ? { count, score } : null;
}

function uniqueNumbers(values: (number | null)[]): number[] {
  return [...new Set(values.filter((value): value is number => typeof value === "number"))].sort(
    (a, b) => a - b,
  );
}

function displayName(row: RentalScoreRow): string {
  const locality = row.complex_name?.trim() || row.district || "부산";
  const addressDetail = row.address
    ?.replace(/^부산광역시\s+/, "")
    .replace(new RegExp(`^${row.district}\\s+`), "")
    .replace(/\([^)]*\)$/, "")
    .trim();
  return `${locality} 매입임대${addressDetail ? ` · ${addressDetail}` : ""}`;
}

function toCondition(row: RentalScoreRow): RentalCondition | null {
  if (typeof row.deposit_krw !== "number" || typeof row.rent_krw !== "number") return null;
  const priority =
    row.priority_rank === 1 || row.priority_rank === 2 || row.priority_rank === 3
      ? row.priority_rank
      : undefined;
  return {
    priorityRank: priority,
    deposit: row.deposit_krw / 10_000,
    monthlyRent: row.rent_krw / 10_000,
    unitNo: row.unit_no === null ? undefined : String(row.unit_no),
    exclusiveArea: row.area_exclusive_m2 ?? undefined,
    roomCount: row.room_count ?? undefined,
  };
}

function buildHousing(address: string, rows: RentalScoreRow[]): HousingUnit {
  const first = rows[0];
  const conditions = rows.map(toCondition).filter((value): value is RentalCondition => value !== null);
  const neighborhood =
    typeof first.store_total_750m === "number" &&
    typeof first.noise_store_750m === "number" &&
    typeof first.noise_ratio === "number" &&
    typeof first.bustle_pct === "number" &&
    typeof first.noise_pct === "number"
      ? {
          storeTotal: first.store_total_750m,
          noiseStoreCount: first.noise_store_750m,
          noiseRatio: first.noise_ratio,
          bustlePercentile: first.bustle_pct,
          noisePercentile: first.noise_pct,
        }
      : null;

  return {
    id: stableId(address),
    name: displayName(first),
    type: "MAEIP_ILBAN",
    gungu: first.district!,
    address: first.address!,
    coord: { lat: first.lat!, lng: first.lon! },
    conditions,
    recruitStatus: "unknown",
    supplyCount: rows.length,
    exclusiveAreas: uniqueNumbers(rows.map((row) => row.area_exclusive_m2)),
    officialUrl: OFFICIAL,
    source: {
      sourceRows: rows,
      sourceRowCount: rows.length,
      pricedUnitCount: conditions.length,
      houseType: first.house_type,
      buildingForm: first.building_form,
      completionYear: first.completion_year,
      elevator: first.elevator,
      parkingCount: first.parking_count,
      heatingType: first.heating_type,
      eligibilitySummary: first.eligibility_summary,
      geocodePrecision: first.geocode_precision,
      geocodeShiftM: first.geocode_shift_m,
      infra: {
        hospital: metric(first.hospital_dist_m, first.hospital_score),
        library: metric(first.library_dist_m, first.library_score),
        mart: metric(first.mart_dist_m, first.mart_score),
        park: metric(first.park_dist_m, first.park_score),
        sports: metric(first.sports_dist_m, first.sports_score),
        subway: metric(first.subway_dist_m, first.subway_score),
      },
      education: {
        daycare: metric(first.daycare_dist_m, first.daycare_score),
        kindergarten: metric(first.kindergarten_dist_m, first.kindergarten_score),
        elementary: metric(first.elementary_dist_m, first.elementary_score),
        middle: metric(first.middle_school_dist_m, first.middle_school_score),
        high: metric(first.high_school_dist_m, first.high_school_score),
      },
      // 키는 2단계 Q5 칩 라벨과 1:1로 맞춘다.
      // 치킨·주점·입시/예체능 학원은 원자료에 대응 열이 없어 null(=점수 축에서 제외)이다.
      stores: {
        식당: storeMetric(first.restaurant_cnt_750m, first.restaurant_score),
        뷰티: storeMetric(first.hair_salon_cnt_750m, first.hair_salon_score),
        카페: storeMetric(first.cafe_cnt_750m, first.cafe_score),
        "편의점/슈퍼마켓": storeMetric(first.convenience_cnt_750m, first.convenience_score),
        "운동/스포츠": storeMetric(first.gym_cnt_750m, first.gym_score),
        베이커리: storeMetric(first.bakery_cnt_750m, first.bakery_score),
        치킨: null,
        주점: null,
        "입시/예체능 학원": null,
        "독서실/스터디카페": storeMetric(first.study_cafe_cnt_750m, first.study_cafe_score),
      },
      neighborhood,
    },
  };
}

const grouped = new Map<string, RentalScoreRow[]>();
for (const row of validRows) {
  const key = row.address_norm!;
  const rows = grouped.get(key);
  if (rows) rows.push(row);
  else grouped.set(key, [row]);
}

export const HOUSING_INVENTORY: HousingUnit[] = [...grouped.entries()]
  .map(([address, rows]) => buildHousing(address, rows))
  .sort((a, b) => a.address.localeCompare(b.address, "ko"));

RENTAL_DATASET_STATS.buildings = HOUSING_INVENTORY.length;

/** 기존 import 호환용 별칭. 값은 더 이상 mock이 아니라 JSON 전체 유효 행이다. */
export const MOCK_HOUSING = HOUSING_INVENTORY;

export const housingById = (id: string) => HOUSING_INVENTORY.find((housing) => housing.id === id);

export function bestCondition(unit: HousingUnit): RentalCondition | null {
  if (unit.conditions.length === 0) return null;
  return unit.conditions.reduce((best, condition) =>
    condition.deposit + condition.monthlyRent * 100 <
    best.deposit + best.monthlyRent * 100
      ? condition
      : best,
  );
}

export function matchingConditions(
  unit: HousingUnit,
  maxDeposit: number,
  maxMonthlyRent: number,
): RentalCondition[] {
  return unit.conditions.filter(
    (condition) => condition.deposit <= maxDeposit && condition.monthlyRent <= maxMonthlyRent,
  );
}
