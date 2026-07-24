/** 계단형 점수(선형보간) 및 가중치 재정규화 유틸. */
import type { StepPoint } from "./scoring.config";
import { AXIS_WEIGHTS, RENORMALIZE_ON_SKIP } from "./scoring.config";
import type { ScoreAxis } from "./recommendation.types";

/** 오름차순 breakpoints에서 거리 → 점수(구간 선형보간, 범위 밖 clamp). */
export function stepScore(distance: number, breakpoints: StepPoint[]): number {
  if (breakpoints.length === 0) return 0;
  if (distance <= breakpoints[0].d) return breakpoints[0].s;
  const last = breakpoints[breakpoints.length - 1];
  if (distance >= last.d) return last.s;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const a = breakpoints[i];
    const b = breakpoints[i + 1];
    if (distance >= a.d && distance <= b.d) {
      const t = (distance - a.d) / (b.d - a.d);
      return a.s + t * (b.s - a.s);
    }
  }
  return last.s;
}

/** 여러 점수의 동등 평균. 빈 배열이면 0. */
export function equalMean(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** 0~1 목표 분위기와 건물 상권 백분위(c)·소음 구성비 백분위(n)의 적합도. */
export function neighborhoodScore(target: number, bustlePercentile: number, noisePercentile: number): number {
  const t = Math.min(1, Math.max(0, target));
  const c = Math.min(1, Math.max(0, bustlePercentile));
  const n = Math.min(1, Math.max(0, noisePercentile));
  const match = 1 - Math.abs(c - t) / Math.max(t, 1 - t);
  const noisePenalty = 1 - 0.5 * n * (1 - t);
  return Math.min(1, Math.max(0, match * noisePenalty));
}

/** 답변된 축에 대해 가중치를 계산.
 *  RENORMALIZE_ON_SKIP=true → 합이 1이 되도록 재정규화. false → 원 가중치(제외 축은 자연히 0). */
export function normalizeWeights(answered: ScoreAxis[]): Partial<Record<ScoreAxis, number>> {
  const out: Partial<Record<ScoreAxis, number>> = {};
  if (answered.length === 0) return out;
  if (!RENORMALIZE_ON_SKIP) {
    for (const a of answered) out[a] = AXIS_WEIGHTS[a];
    return out;
  }
  const total = answered.reduce((sum, a) => sum + AXIS_WEIGHTS[a], 0);
  for (const a of answered) out[a] = AXIS_WEIGHTS[a] / total;
  return out;
}
