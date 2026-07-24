/** 2단계 추천 서비스: 하드필터 → 축별 점수 → 가중합 → 정성 근거.
 *  자격 판정 값은 이 파이프라인에 입력하지 않는다(혼합 금지). */
import { boostedMeters } from "@/lib/coordinates";
import { formatDistance, formatManwon, formatPercentileTop } from "@/lib/formatting";
import {
  MOCK_HOUSING,
  bestCondition,
  conservativeCondition,
  type HousingUnit,
} from "@/mocks/housing";
import {
  neighborhoodProfile,
  nearestEduMeters,
  nearestInfraMeters,
  storeDensity,
} from "@/mocks/facilities";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import {
  AXIS_LABEL,
  type CategoryScore,
  type FilterOutcome,
  type HousingRecommendation,
  type PreferenceSurveyInput,
  type RecommendationReason,
  type ScoreAxis,
} from "./recommendation.types";
import {
  EDU_STEPS_BY_CATEGORY,
  FREQUENT_STEPS,
  INFRA_STEPS_BY_CATEGORY,
} from "./scoring.config";
import { equalMean, neighborhoodScore, normalizeWeights, stepScore } from "./scoring.utils";
import { gunguByName } from "@/mocks/regions";

interface AxisResult {
  score: number;
  raw: string;
}

function scoreFrequent(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult {
  const dists = s.frequent.map((d) => boostedMeters(unit.coord, d.coord));
  const scores = dists.map((d) => stepScore(d, FREQUENT_STEPS));
  const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
  return { score: equalMean(scores), raw: `예상 보정거리 평균 ${formatDistance(avgDist)}` };
}

function scoreInfra(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult {
  const cats = s.infra.categories;
  const distances = cats.map((category) => ({
    category,
    distance: nearestInfraMeters(unit.coord, category),
  }));
  const scores = distances.map(({ category, distance }) =>
    stepScore(distance, INFRA_STEPS_BY_CATEGORY[category]),
  );
  const close = scores.filter((v) => v >= 0.6).length;
  const nearest = distances.reduce((best, item) => (item.distance < best.distance ? item : best));
  return {
    score: equalMean(scores),
    raw: `선택 ${cats.length}개 중 ${close}개가 가까운 편 · 최근접 ${formatDistance(nearest.distance)}`,
  };
}

function scoreEducation(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult {
  const cats = s.education.categories;
  const scores = cats.map((c) => stepScore(nearestEduMeters(unit.coord, c), EDU_STEPS_BY_CATEGORY[c]));
  const close = scores.filter((v) => v >= 0.6).length;
  return { score: equalMean(scores), raw: `선택한 ${cats.length}개 중 ${close}개가 가까운 편` };
}

function scoreStore(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult | null {
  const densities = s.store.chips
    .map((chip) => ({ chip, density: storeDensity(unit.id, chip) }))
    .filter(
      (item): item is { chip: string; density: { count: number; percentile: number } } =>
        item.density !== null,
    );
  if (densities.length === 0) return null;
  const mean = equalMean(densities.map((item) => item.density.percentile));
  const strongest = [...densities].sort((a, b) => b.density.percentile - a.density.percentile)[0];
  return {
    score: mean,
    raw: `${strongest.chip} ${strongest.density.count}곳 · 평균 밀도 ${formatPercentileTop(mean)} (건물 기준)`,
  };
}

function moodLabel(target: number): string {
  if (target <= 0.25) return "조용";
  if (target >= 0.75) return "번화";
  return "적당";
}

function scoreNeighborhood(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult | null {
  const profile = neighborhoodProfile(unit.id);
  const target = s.neighborhood.target;
  if (!profile || target === null) return null;
  const score = neighborhoodScore(target, profile.bustlePercentile, profile.noisePercentile);
  return {
    score,
    raw: `상가 ${profile.storeCount}곳 · 번화도 ${Math.round(profile.bustlePercentile * 100)}백분위 · 희망 ${moodLabel(target)}`,
  };
}

function answeredAxes(s: PreferenceSurveyInput): ScoreAxis[] {
  const skip = new Set(s.skipped);
  const axes: ScoreAxis[] = [];
  if (s.frequent.length > 0 && !skip.has("frequent")) axes.push("frequent");
  if (s.infra.categories.length > 0 && !skip.has("infra")) axes.push("infra");
  if (s.education.enabled && s.education.categories.length > 0 && !skip.has("education")) axes.push("education");
  if (s.store.chips.length > 0 && !skip.has("store")) axes.push("store");
  if (s.neighborhood.target !== null && !skip.has("neighborhood")) axes.push("neighborhood");
  return axes;
}

const AXIS_FN: Record<ScoreAxis, (u: HousingUnit, s: PreferenceSurveyInput) => AxisResult | null> = {
  frequent: scoreFrequent,
  infra: scoreInfra,
  education: scoreEducation,
  store: scoreStore,
  neighborhood: scoreNeighborhood,
};

export type BudgetConditionSource = "호실일치" | "건물중앙값" | "없음";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function resolveBudgetCondition(
  unit: HousingUnit,
  inventory: HousingUnit[] = MOCK_HOUSING,
): { condition: ReturnType<typeof conservativeCondition> | null; source: BudgetConditionSource } {
  if (unit.conditions.length > 0) {
    return { condition: conservativeCondition(unit), source: "호실일치" };
  }
  const sameBuilding = inventory
    .filter((candidate) => candidate.address === unit.address && candidate.conditions.length > 0)
    .flatMap((candidate) => candidate.conditions);
  if (sameBuilding.length === 0) return { condition: null, source: "없음" };
  return {
    condition: {
      deposit: median(sameBuilding.map((condition) => condition.deposit)),
      monthlyRent: median(sameBuilding.map((condition) => condition.monthlyRent)),
    },
    source: "건물중앙값",
  };
}

function withinBudget(unit: HousingUnit, s: PreferenceSurveyInput): boolean {
  const { condition } = resolveBudgetCondition(unit);
  if (!condition) return false;
  return (
    condition.deposit <= s.budget.maxDeposit &&
    condition.monthlyRent <= s.budget.maxMonthlyRent
  );
}

function inRegion(unit: HousingUnit, s: PreferenceSurveyInput): boolean {
  if (s.region.anyRegion || s.region.gungus.length === 0) return true;
  return s.region.gungus.includes(unit.gungu);
}

export function recommend(
  passed: EligibilityTypeCode[],
  survey: PreferenceSurveyInput,
): FilterOutcome {
  const passedSet = new Set(passed);
  const pool = MOCK_HOUSING.filter((h) => passedSet.has(h.type));

  const budgetPass = pool.filter((h) => withinBudget(h, survey));
  if (budgetPass.length === 0) {
    const nearMiss = pool.filter((h) => {
      const { condition } = resolveBudgetCondition(h);
      return (
        condition !== null &&
        condition.deposit <= survey.budget.maxDeposit * 1.2 &&
        condition.monthlyRent <= survey.budget.maxMonthlyRent * 1.2
      );
    }).length;
    return { kind: "empty", reason: "budget", nearMissCount: nearMiss };
  }

  const regionPass = budgetPass.filter((h) => inRegion(h, survey));
  if (regionPass.length === 0) {
    return { kind: "empty", reason: "region", nearMissCount: budgetPass.length };
  }

  const axes = answeredAxes(survey);
  const recs: HousingRecommendation[] = regionPass.map((unit) => {
    const available = axes
      .map((axis) => ({ axis, result: AXIS_FN[axis](unit, survey) }))
      .filter((item): item is { axis: ScoreAxis; result: AxisResult } => item.result !== null);
    const weights = normalizeWeights(available.map((item) => item.axis));
    const byAxis: CategoryScore[] = available.map(({ axis, result }) => ({
      axis,
      score: result.score,
      weight: weights[axis] ?? 0,
      raw: result.raw,
    }));
    const final = byAxis.reduce((sum, a) => sum + a.score * a.weight, 0);

    const reasons: RecommendationReason[] = [];
    const best = bestCondition(unit);
    const budget = resolveBudgetCondition(unit);
    reasons.push({
      axis: "budget",
      text: "보증금과 월 임대료가 예산 안에 있어요.",
      rawValue: `보증금 ${formatManwon(best.deposit)} · 월 ${formatManwon(best.monthlyRent)} · 금액 출처 ${budget.source}`,
    });
    [...byAxis]
      .sort((a, b) => b.score * b.weight - a.score * a.weight)
      .slice(0, 2)
      .forEach((a) => reasons.push({ axis: a.axis, text: `${AXIS_LABEL[a.axis]} 조건이 잘 맞아요.`, rawValue: a.raw }));
    reasons.push({
      axis: "eligibility",
      text: "소득·자산 기준은 실제 모집공고에서 다시 확인해야 해요.",
      rawValue: "1단계 판정은 참고용이에요.",
    });

    return {
      unitId: unit.id,
      score: { final, byAxis, normalizedWeights: weights },
      reasons,
      eligibilityType: unit.type,
      checkLater: ["실제 신청 자격은 모집공고 기준으로 확정돼요."],
    };
  });

  recs.sort((a, b) => b.score.final - a.score.final);
  return { kind: "ok", recommendations: recs };
}

/** 정렬 유틸 (B4). */
export type SortKey = "recommend" | "rent" | "deposit" | "distance";
export function sortRecommendations(
  recs: HousingRecommendation[],
  key: SortKey,
  originForDistance?: { lat: number; lng: number },
): HousingRecommendation[] {
  const copy = [...recs];
  const unit = (id: string) => MOCK_HOUSING.find((h) => h.id === id)!;
  switch (key) {
    case "rent":
      return copy.sort((a, b) => bestCondition(unit(a.unitId)).monthlyRent - bestCondition(unit(b.unitId)).monthlyRent);
    case "deposit":
      return copy.sort((a, b) => bestCondition(unit(a.unitId)).deposit - bestCondition(unit(b.unitId)).deposit);
    case "distance":
      if (originForDistance) {
        return copy.sort(
          (a, b) => boostedMeters(unit(a.unitId).coord, originForDistance) - boostedMeters(unit(b.unitId).coord, originForDistance),
        );
      }
      return copy;
    default:
      return copy.sort((a, b) => b.score.final - a.score.final);
  }
}

/** 최종 점수(0~1)를 정성적 적합도 라벨로. 벌거벗은 숫자 대신 이해 가능한 표현.
 *  byAxis가 비어있으면(browse 모드) 적합도를 계산하지 않는다(null). */
export type MatchTone = "success" | "primary" | "neutral";
export function matchLevel(rec: HousingRecommendation): { label: string; tone: MatchTone } | null {
  if (rec.score.byAxis.length === 0) return null;
  const f = rec.score.final;
  if (f >= 0.75) return { label: "매우 잘 맞아요", tone: "success" };
  if (f >= 0.5) return { label: "잘 맞아요", tone: "success" };
  if (f >= 0.3) return { label: "무난해요", tone: "primary" };
  return { label: "조건 확인 필요", tone: "neutral" };
}

export { gunguByName };
