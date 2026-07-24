/** 2단계 추천 서비스: 하드필터 → 축별 점수 → 가중합 → 정성 근거.
 *  자격 판정 값은 이 파이프라인에 입력하지 않는다(혼합 금지). */
import { boostedMeters } from "@/lib/coordinates";
import { formatDistance, formatManwon, formatPercentileTop } from "@/lib/formatting";
import {
  MOCK_HOUSING,
  bestCondition,
  matchingConditions,
  type HousingUnit,
} from "@/mocks/housing";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import {
  AXIS_LABEL,
  type EduCategory,
  type InfraCategory,
  type CategoryScore,
  type FilterOutcome,
  type HousingRecommendation,
  type PreferenceSurveyInput,
  type RecommendationReason,
  type ScoreAxis,
} from "./recommendation.types";
import {
  FREQUENT_STEPS,
} from "./scoring.config";
import { equalMean, neighborhoodScore, normalizeWeights, stepScore } from "./scoring.utils";
import { gunguByName } from "@/mocks/regions";

interface AxisResult {
  score: number;
  raw: string;
}

function scoreFrequent(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult {
  const dists = s.frequent.slice(0, 1).map((d) => boostedMeters(unit.coord, d.coord));
  const scores = dists.map((d) => stepScore(d, FREQUENT_STEPS));
  const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
  return { score: equalMean(scores), raw: `예상 보정거리 ${formatDistance(avgDist)}` };
}

const INFRA_PROFILE_KEY: Record<InfraCategory, keyof HousingUnit["source"]["infra"]> = {
  HOSPITAL: "hospital",
  MART: "mart",
  PARK: "park",
  LIBRARY: "library",
  SPORTS: "sports",
  SUBWAY: "subway",
};

const EDU_PROFILE_KEY: Record<EduCategory, keyof HousingUnit["source"]["education"]> = {
  DAYCARE: "daycare",
  KINDER: "kindergarten",
  ELEM: "elementary",
  MIDDLE: "middle",
  HIGH: "high",
};

function scoreInfra(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult | null {
  const metrics = s.infra.categories
    .map((category) => unit.source.infra[INFRA_PROFILE_KEY[category]])
    .filter((value): value is NonNullable<typeof value> => value !== null);
  if (metrics.length === 0) return null;
  const close = metrics.filter(({ score }) => score >= 0.6).length;
  const nearest = metrics.reduce((best, item) =>
    item.distance < best.distance ? item : best,
  );
  return {
    score: equalMean(metrics.map(({ score }) => score)),
    raw: `계산 가능한 ${metrics.length}개 중 ${close}개가 가까운 편 · 최근접 ${formatDistance(nearest.distance)}`,
  };
}

function scoreEducation(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult | null {
  const metrics = s.education.categories
    .map((category) => unit.source.education[EDU_PROFILE_KEY[category]])
    .filter((value): value is NonNullable<typeof value> => value !== null);
  if (metrics.length === 0) return null;
  const close = metrics.filter(({ score }) => score >= 0.6).length;
  const nearest = metrics.reduce((best, item) =>
    item.distance < best.distance ? item : best,
  );
  return {
    score: equalMean(metrics.map(({ score }) => score)),
    raw: `계산 가능한 ${metrics.length}개 중 ${close}개가 가까운 편 · 최근접 ${formatDistance(nearest.distance)}`,
  };
}

function scoreStore(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult | null {
  const densities = s.store.chips
    .map((chip) => ({ chip, density: unit.source.stores[chip] ?? null }))
    .filter(
      (item): item is { chip: string; density: { count: number; score: number } } =>
        item.density !== null,
    );
  if (densities.length === 0) return null;
  const mean = equalMean(densities.map((item) => item.density.score));
  const strongest = [...densities].sort((a, b) => b.density.score - a.density.score)[0];
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
  const profile = unit.source.neighborhood;
  const target = s.neighborhood.target;
  if (!profile || target === null) return null;
  const score = neighborhoodScore(target, profile.bustlePercentile, profile.noisePercentile);
  return {
    score,
    raw: `상가 ${profile.storeTotal}곳 · 번화도 ${Math.round(profile.bustlePercentile * 100)}백분위 · 희망 ${moodLabel(target)}`,
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

function withinBudget(unit: HousingUnit, s: PreferenceSurveyInput): boolean {
  return matchingConditions(
    unit,
    s.budget.maxDeposit,
    s.budget.maxMonthlyRent,
  ).length > 0;
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
    const nearMiss = pool.filter(
      (housing) =>
        matchingConditions(
          housing,
          survey.budget.maxDeposit * 1.2,
          survey.budget.maxMonthlyRent * 1.2,
        ).length > 0,
    ).length;
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
    const best = matchingConditions(
      unit,
      survey.budget.maxDeposit,
      survey.budget.maxMonthlyRent,
    ).sort(
      (a, b) =>
        a.deposit + a.monthlyRent * 100 -
        (b.deposit + b.monthlyRent * 100),
    )[0];
    reasons.push({
      axis: "budget",
      text: `예산에 맞는 호실이 ${matchingConditions(unit, survey.budget.maxDeposit, survey.budget.maxMonthlyRent).length}개 있어요.`,
      rawValue: `최저 보증금 ${formatManwon(best.deposit)} · 월 ${formatManwon(best.monthlyRent)} · 호실 일치`,
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
  const conditionValue = (id: string, field: "deposit" | "monthlyRent") =>
    bestCondition(unit(id))?.[field] ?? Number.POSITIVE_INFINITY;
  switch (key) {
    case "rent":
      return copy.sort(
        (a, b) =>
          conditionValue(a.unitId, "monthlyRent") -
          conditionValue(b.unitId, "monthlyRent"),
      );
    case "deposit":
      return copy.sort(
        (a, b) =>
          conditionValue(a.unitId, "deposit") -
          conditionValue(b.unitId, "deposit"),
      );
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
