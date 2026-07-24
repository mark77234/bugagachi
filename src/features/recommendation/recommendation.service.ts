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
  nearestCommercialMeters,
  nearestEduMeters,
  nearestInfraMeters,
  storePercentile,
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
  NEIGHBORHOOD_TEMP,
} from "./scoring.config";
import { equalMean, normalizeWeights, stepScore } from "./scoring.utils";
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
  const scores = cats.map((c) => stepScore(nearestInfraMeters(unit.coord, c), INFRA_STEPS_BY_CATEGORY[c]));
  const close = scores.filter((v) => v >= 0.6).length;
  return { score: equalMean(scores), raw: `선택한 ${cats.length}개 중 ${close}개가 가까운 편` };
}

function scoreEducation(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult {
  const cats = s.education.categories;
  const scores = cats.map((c) => stepScore(nearestEduMeters(unit.coord, c), EDU_STEPS_BY_CATEGORY[c]));
  const close = scores.filter((v) => v >= 0.6).length;
  return { score: equalMean(scores), raw: `선택한 ${cats.length}개 중 ${close}개가 가까운 편` };
}

function scoreStore(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult {
  const items = [...s.store.chips, ...s.store.custom];
  const pcts = items.map((chip) => storePercentile(unit.id, chip));
  const mean = equalMean(pcts);
  return { score: mean, raw: `밀도 ${formatPercentileTop(mean)} (부산 전체 주택 기준)` };
}

function classifyNeighborhood(unit: HousingUnit): "quiet" | "moderate" | "lively" {
  const d = nearestCommercialMeters(unit.coord);
  if (d <= NEIGHBORHOOD_TEMP.livelyMaxM) return "lively";
  if (d >= NEIGHBORHOOD_TEMP.quietMinM) return "quiet";
  return "moderate";
}

const MOOD_LABEL = { quiet: "조용한", moderate: "적당한", lively: "번화한" } as const;

function scoreNeighborhood(unit: HousingUnit, s: PreferenceSurveyInput): AxisResult {
  const pref = s.neighborhood.mood!;
  const area = classifyNeighborhood(unit);
  const order = ["quiet", "moderate", "lively"];
  const gap = Math.abs(order.indexOf(pref) - order.indexOf(area));
  const score = gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
  return { score, raw: `이 동네는 ${MOOD_LABEL[area]} 편 (희망: ${MOOD_LABEL[pref]})` };
}

function answeredAxes(s: PreferenceSurveyInput): ScoreAxis[] {
  const skip = new Set(s.skipped);
  const axes: ScoreAxis[] = [];
  if (s.frequent.length > 0 && !skip.has("frequent")) axes.push("frequent");
  if (s.infra.categories.length > 0 && !skip.has("infra")) axes.push("infra");
  if (s.education.enabled && s.education.categories.length > 0 && !skip.has("education")) axes.push("education");
  if (s.store.chips.length + s.store.custom.length > 0 && !skip.has("store")) axes.push("store");
  if (s.neighborhood.mood && !skip.has("neighborhood")) axes.push("neighborhood");
  return axes;
}

const AXIS_FN: Record<ScoreAxis, (u: HousingUnit, s: PreferenceSurveyInput) => AxisResult> = {
  frequent: scoreFrequent,
  infra: scoreInfra,
  education: scoreEducation,
  store: scoreStore,
  neighborhood: scoreNeighborhood,
};

function withinBudget(unit: HousingUnit, s: PreferenceSurveyInput): boolean {
  const c = conservativeCondition(unit); // 보수적: 가장 비싼 조건 기준
  return c.deposit <= s.budget.maxDeposit && c.monthlyRent <= s.budget.maxMonthlyRent;
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
      const c = conservativeCondition(h);
      return c.deposit <= survey.budget.maxDeposit * 1.2 && c.monthlyRent <= survey.budget.maxMonthlyRent * 1.2;
    }).length;
    return { kind: "empty", reason: "budget", nearMissCount: nearMiss };
  }

  const regionPass = budgetPass.filter((h) => inRegion(h, survey));
  if (regionPass.length === 0) {
    return { kind: "empty", reason: "region", nearMissCount: budgetPass.length };
  }

  const axes = answeredAxes(survey);
  const weights = normalizeWeights(axes);

  const recs: HousingRecommendation[] = regionPass.map((unit) => {
    const byAxis: CategoryScore[] = axes.map((axis) => {
      const r = AXIS_FN[axis](unit, survey);
      return { axis, score: r.score, weight: weights[axis] ?? 0, raw: r.raw };
    });
    const final = byAxis.reduce((sum, a) => sum + a.score * a.weight, 0);

    const reasons: RecommendationReason[] = [];
    const best = bestCondition(unit);
    reasons.push({
      axis: "budget",
      text: "보증금과 월 임대료가 예산 안에 있어요.",
      rawValue: `보증금 ${formatManwon(best.deposit)} · 월 ${formatManwon(best.monthlyRent)}`,
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
