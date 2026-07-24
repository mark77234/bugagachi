/** 2단계 취향 추천 도메인 타입. */
import type { LatLng } from "@/lib/coordinates";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export type ScoreAxis = "frequent" | "infra" | "education" | "store" | "neighborhood";

export const AXIS_LABEL: Record<ScoreAxis, string> = {
  frequent: "자주 가는 장소",
  infra: "기반시설",
  education: "돌봄·교육",
  store: "취향 가게",
  neighborhood: "동네 분위기",
};

export type InfraCategory = "HOSPITAL" | "MART" | "PARK" | "LIBRARY" | "SPORTS" | "SUBWAY";
export type EduCategory = "DAYCARE" | "KINDER" | "ELEM" | "MIDDLE" | "HIGH";

export interface BudgetCondition {
  maxDeposit: number; // 만원
  maxMonthlyRent: number; // 만원
}
export interface RegionCondition {
  gungus: string[];
  anyRegion: boolean;
}
export interface FrequentDestination {
  id: string;
  label: string;
  address: string;
  coord: LatLng;
}
export interface InfrastructurePreference {
  categories: InfraCategory[];
}
export interface EducationPreference {
  enabled: boolean;
  categories: EduCategory[];
}
export interface StorePreference {
  chips: string[];
  custom: string[];
}
export interface NeighborhoodPreference {
  /** 0=조용, 0.5=적당, 1=번화. null이면 "상관없어요". */
  target: number | null;
}

export interface PreferenceSurveyInput {
  budget: BudgetCondition;
  region: RegionCondition;
  frequent: FrequentDestination[];
  infra: InfrastructurePreference;
  education: EducationPreference;
  store: StorePreference;
  neighborhood: NeighborhoodPreference;
  skipped: ScoreAxis[];
}

export interface CategoryScore {
  axis: ScoreAxis;
  score: number; // 0~1
  weight: number; // 재정규화된 가중치
  raw: string; // 원본 값 요약 (거리/개수/백분위)
}
export interface RecommendationReason {
  axis: ScoreAxis | "budget" | "eligibility";
  text: string;
  rawValue: string;
}
export interface RecommendationScore {
  final: number; // 0~1 (내부용)
  byAxis: CategoryScore[];
  normalizedWeights: Partial<Record<ScoreAxis, number>>;
}
export interface HousingRecommendation {
  unitId: string;
  score: RecommendationScore;
  reasons: RecommendationReason[];
  eligibilityType: EligibilityTypeCode;
  checkLater: string[];
}

export type FilterOutcome =
  | { kind: "ok"; recommendations: HousingRecommendation[] }
  | { kind: "empty"; reason: "budget" | "region"; nearMissCount: number };
