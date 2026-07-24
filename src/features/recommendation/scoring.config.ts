/** 2단계 점수 상수 (docs/RECOMMENDATION_SCORING_SPEC.md).
 *  가중치·계단 breakpoints·우회계수·Q6 임시경계 — 전부 여기 격리.
 *  화면 컴포넌트는 이 값을 직접 참조하지 않는다. */
import { BUSAN_DETOUR_FACTOR } from "@/lib/coordinates";
import type { EduCategory, InfraCategory, ScoreAxis } from "./recommendation.types";

export { BUSAN_DETOUR_FACTOR };

/** 축별 가중치 (합 = 1.0). */
export const AXIS_WEIGHTS: Record<ScoreAxis, number> = {
  frequent: 0.3,
  infra: 0.25,
  education: 0.2,
  store: 0.15,
  neighborhood: 0.1,
};

/** [정책 P1] 축 제외 시 남은 축 합=1로 재정규화(true) vs 0점(false). 기본 재정규화. */
export const RENORMALIZE_ON_SKIP = true;

export interface StepPoint {
  d: number; // meters
  s: number; // score 0~1
}

/** Q2 자주 가는 장소 (보정거리 기준). */
export const FREQUENT_STEPS: StepPoint[] = [
  { d: 5000, s: 1.0 },
  { d: 10000, s: 0.7 },
  { d: 30000, s: 0.0 },
];

/** Q3 도보 시설 (마트·공원·생활체육·지하철). */
export const INFRA_WALK_STEPS: StepPoint[] = [
  { d: 750, s: 1.0 },
  { d: 1500, s: 0.6 },
  { d: 3000, s: 0.2 },
  { d: 6000, s: 0.0 },
];

/** Q3 거점형 시설(병원·도서관, 차량 기준). */
export const INFRA_VEHICLE_STEPS: StepPoint[] = [
  { d: 5000, s: 1.0 },
  { d: 10000, s: 0.6 },
  { d: 15000, s: 0.2 },
  { d: 20000, s: 0.0 },
];

export const INFRA_STEPS_BY_CATEGORY: Record<InfraCategory, StepPoint[]> = {
  HOSPITAL: INFRA_VEHICLE_STEPS,
  MART: INFRA_WALK_STEPS,
  PARK: INFRA_WALK_STEPS,
  LIBRARY: INFRA_VEHICLE_STEPS,
  SPORTS: INFRA_WALK_STEPS,
  SUBWAY: INFRA_WALK_STEPS,
};

/** Q4 어린이집. */
export const EDU_DAYCARE_STEPS: StepPoint[] = [
  { d: 375, s: 1.0 },
  { d: 750, s: 0.6 },
  { d: 1500, s: 0.2 },
  { d: 3000, s: 0.0 },
];

/** Q4 유치원·초·중·고. */
export const EDU_SCHOOL_STEPS: StepPoint[] = [
  { d: 750, s: 1.0 },
  { d: 1500, s: 0.6 },
  { d: 3000, s: 0.2 },
  { d: 6000, s: 0.0 },
];

export const EDU_STEPS_BY_CATEGORY: Record<EduCategory, StepPoint[]> = {
  DAYCARE: EDU_DAYCARE_STEPS,
  KINDER: EDU_SCHOOL_STEPS,
  ELEM: EDU_SCHOOL_STEPS,
  MIDDLE: EDU_SCHOOL_STEPS,
  HIGH: EDU_SCHOOL_STEPS,
};

/** Q5 취향 가게 반경(m). */
export const STORE_RADIUS_M = 750;

/** Q6 소음 감점 상한. */
export const NEIGHBORHOOD_NOISE_CAP = 0.5;
