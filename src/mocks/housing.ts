/**
 * 부산 공공임대 주택 재고 어댑터 (실데이터).
 *
 * 원본은 `data/real_house_data/master_*.json` 4종 84,002 호실행이지만, 통합공공임대가
 * "소득구간 × 가구인원수 × 주택형" 조합마다 한 행씩 들어 있어 대부분이 가격표 중복이다.
 * `scripts/build-housing-index.mjs` 가 이를 건물(355) · 물리 호실(9,022) · 가격행(930)으로
 * 정규화하고 docs/score_logic.md 의 Q3~Q6 점수까지 계산해 `data/housing_index.json` 을 굽는다.
 *
 * 이 파일은 그 결과를 화면이 쓰는 도메인 타입으로 바꾸는 얇은 어댑터다.
 * (거리·백분위는 여기서 다시 계산하지 않는다)
 */
import housingIndexJson from "../../data/housing_index.json";
import type { LatLng } from "@/lib/coordinates";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export type RecruitStatus = "open" | "upcoming" | "closed" | "unknown";

export interface HousingMetric {
  distance: number;
  score: number;
}

export interface StoreMetric {
  count: number;
  score: number;
}

/** 물리 호실 — 같은 호실이 가격 조합마다 반복되던 것을 하나로 접은 단위. */
export interface HousingSpecUnit {
  dong: string | null;
  unitNo: string | null;
  unitType: string | null;
  areaM2: number | null;
  areaPyeong: number | null;
  commonAreaM2: number | null;
  roomCount: number | null;
  roomLayout: string | null;
}

/** 가격행 — 통합공공임대는 소득구간·가구인원수마다 임대료가 다르다. */
export interface HousingPriceRow {
  unitType: string | null;
  incomeBracket: string | null;
  householdSize: string | null;
  priorityRank: number | null;
  supplyClass: string | null;
  protectionType: string | null;
  depositManwon: number;
  rentManwon: number;
  areaM2: number | null;
  roomCount: number | null;
}

export interface RentalCondition {
  priorityRank?: 1 | 2 | 3;
  deposit: number; // 만원
  monthlyRent: number; // 만원
  unitNo?: string;
  exclusiveArea?: number;
  roomCount?: number;
  /** 통합공공임대 가격 조건 식별용 */
  incomeBracket?: string;
  householdSize?: string;
  unitType?: string;
  supplyClass?: string;
  protectionType?: string;
}

export interface HousingSourceData {
  units: HousingSpecUnit[];
  prices: HousingPriceRow[];
  /** 정규화 전 원본 행 수 (데이터 출처 표기용) */
  sourceRowCount: number;
  pricedUnitCount: number;
  houseType: string | null;
  buildingForm: string | null;
  completionYear: number | null;
  ageLabel: string | null;
  elevator: string | null;
  parkingCount: number | null;
  householdCount: number | null;
  heatingType: string | null;
  eligibilitySummaries: string[];
  supplyClasses: string[];
  /** 가격 기준일 (여러 건이면 오름차순) */
  priceDates: string[];
  noticeUrl: string | null;
  applyPortal: string | null;
  dataSource: string | null;
  updatedAt: string | null;
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

// ── 원본 인덱스 타입 (build-housing-index.mjs 출력) ─────────────────────
interface RawMetric {
  distance: number | null;
  score: number | null;
}
interface RawBuilding {
  id: string;
  address: string;
  type: EligibilityTypeCode;
  rentalTypeLabel: string | null;
  gungu: string;
  complexName: string | null;
  lat: number;
  lng: number;
  houseType: string | null;
  completionYear: string | null;
  ageLabel: string | null;
  elevator: string | null;
  parkingCount: number | null;
  householdCount: number | null;
  buildingForm: string | null;
  heating: string | null;
  noticeUrl: string | null;
  applyPortal: string | null;
  dataSource: string | null;
  updatedAt: string | null;
  priceDates: string[];
  eligibilitySummaries: string[];
  supplyClasses: string[];
  sourceRowCount: number;
  units: HousingSpecUnit[];
  prices: HousingPriceRow[];
  scores: {
    infra: Record<string, RawMetric>;
    education: Record<string, RawMetric>;
    chipCount: Record<string, number>;
    chipScore: Record<string, number>;
    storeTotal: number;
    noiseStore: number;
    noiseRatio: number;
    bustlePct: number;
    noisePct: number;
  };
}
interface RawIndex {
  chips: string[];
  stats: { sourceRows: number; validRows: number; buildings: number; units: number; priceRows: number };
  buildings: RawBuilding[];
}

const INDEX = housingIndexJson as unknown as RawIndex;

export const RENTAL_DATASET_STATS = {
  sourceRows: INDEX.stats.sourceRows,
  validRows: INDEX.stats.validRows,
  ignoredEmptyRows: INDEX.stats.sourceRows - INDEX.stats.validRows,
  buildings: INDEX.stats.buildings,
  /** 정규화된 물리 호실 수 */
  units: INDEX.stats.units,
  priceRows: INDEX.stats.priceRows,
};

/** 2단계 Q5 칩 라벨 10종 (전처리와 동일 순서). */
export const STORE_CHIPS = INDEX.chips;

const PORTAL_FALLBACK = "https://www.myhome.go.kr";

function metric(raw: RawMetric | undefined): HousingMetric | null {
  if (!raw || raw.distance === null || raw.score === null) return null;
  return { distance: raw.distance, score: raw.score };
}

function toCondition(price: HousingPriceRow): RentalCondition {
  const rank = price.priorityRank;
  return {
    priorityRank: rank === 1 || rank === 2 || rank === 3 ? rank : undefined,
    deposit: price.depositManwon,
    monthlyRent: price.rentManwon,
    exclusiveArea: price.areaM2 ?? undefined,
    roomCount: price.roomCount ?? undefined,
    incomeBracket: price.incomeBracket ?? undefined,
    householdSize: price.householdSize ?? undefined,
    unitType: price.unitType ?? undefined,
    supplyClass: price.supplyClass ?? undefined,
    protectionType: price.protectionType ?? undefined,
  };
}

/** 단지명이 주소를 그대로 복사한 경우가 있어, 그럴 땐 주소에서 읽기 쉬운 이름을 만든다. */
function displayName(raw: RawBuilding): string {
  const complex = raw.complexName?.trim();
  const detail = raw.address
    .replace(/^부산광역시\s+/, "")
    .replace(new RegExp(`^${raw.gungu}\\s+`), "")
    .trim();
  if (complex && complex !== raw.address && !complex.startsWith("부산광역시")) return complex;
  return `${raw.gungu} ${detail}`.trim();
}

function buildHousing(raw: RawBuilding): HousingUnit {
  const conditions = raw.prices.map(toCondition);
  const areas = [
    ...new Set(
      raw.units.map((unit) => unit.areaM2).filter((value): value is number => typeof value === "number"),
    ),
  ].sort((a, b) => a - b);
  const scores = raw.scores;

  return {
    id: raw.id,
    name: displayName(raw),
    type: raw.type,
    gungu: raw.gungu,
    address: raw.address,
    coord: { lat: raw.lat, lng: raw.lng },
    conditions,
    // 모집 일정은 마스터에 없다. 실시간 공고는 공식 포털에서 확인하도록 안내한다.
    recruitStatus: "unknown",
    supplyCount: raw.units.length,
    exclusiveAreas: areas,
    officialUrl: raw.noticeUrl ?? PORTAL_FALLBACK,
    source: {
      units: raw.units,
      prices: raw.prices,
      sourceRowCount: raw.sourceRowCount,
      pricedUnitCount: conditions.length,
      houseType: raw.houseType,
      buildingForm: raw.buildingForm,
      completionYear: raw.completionYear ? Number.parseInt(raw.completionYear, 10) || null : null,
      ageLabel: raw.ageLabel,
      elevator: raw.elevator,
      parkingCount: raw.parkingCount,
      householdCount: raw.householdCount,
      heatingType: raw.heating,
      eligibilitySummaries: raw.eligibilitySummaries,
      supplyClasses: raw.supplyClasses,
      priceDates: raw.priceDates,
      noticeUrl: raw.noticeUrl,
      applyPortal: raw.applyPortal,
      dataSource: raw.dataSource,
      updatedAt: raw.updatedAt,
      infra: {
        hospital: metric(scores.infra.HOSPITAL),
        library: metric(scores.infra.LIBRARY),
        mart: metric(scores.infra.MART),
        park: metric(scores.infra.PARK),
        sports: metric(scores.infra.SPORTS),
        subway: metric(scores.infra.SUBWAY),
      },
      education: {
        daycare: metric(scores.education.DAYCARE),
        kindergarten: metric(scores.education.KINDER),
        elementary: metric(scores.education.ELEM),
        middle: metric(scores.education.MIDDLE),
        high: metric(scores.education.HIGH),
      },
      // 키는 2단계 Q5 칩 라벨과 1:1. 이제 10종 모두 실제 집계값이 있다.
      stores: Object.fromEntries(
        INDEX.chips.map((chip) => [
          chip,
          { count: scores.chipCount[chip] ?? 0, score: scores.chipScore[chip] ?? 0 },
        ]),
      ),
      neighborhood: {
        storeTotal: scores.storeTotal,
        noiseStoreCount: scores.noiseStore,
        noiseRatio: scores.noiseRatio,
        bustlePercentile: scores.bustlePct,
        noisePercentile: scores.noisePct,
      },
    },
  };
}

export const HOUSING_INVENTORY: HousingUnit[] = INDEX.buildings.map(buildHousing);

/** 기존 import 호환용 별칭. 값은 mock 이 아니라 실데이터 전량이다. */
export const MOCK_HOUSING = HOUSING_INVENTORY;

const BY_ID = new Map(HOUSING_INVENTORY.map((unit) => [unit.id, unit]));
export const housingById = (id: string) => BY_ID.get(id);

/** 보증금 + 월세×100 이 가장 낮은 조건 = 대표 조건. */
export function bestCondition(unit: HousingUnit): RentalCondition | null {
  if (unit.conditions.length === 0) return null;
  return unit.conditions.reduce((best, condition) =>
    condition.deposit + condition.monthlyRent * 100 < best.deposit + best.monthlyRent * 100
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
