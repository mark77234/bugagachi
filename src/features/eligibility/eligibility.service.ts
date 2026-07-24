/** 자격 판정 서비스 레이어 (UI ↔ 규칙 엔진 경계).
 *  추후 이 파일의 함수를 서버 API 호출로 교체하면 화면은 그대로 유지된다. */
import { BASE_YEAR_NOTE } from "@/config/eligibility-config.2025";
import { ELIGIBILITY_TYPE_LABEL } from "./eligibility.types";
import type {
  EligibilityCommonInput,
  EligibilityDetailInput,
  EligibilityTypeCode,
  EligibilityTypeResult,
} from "./eligibility.types";
import { evaluateAll, stage1Common } from "./eligibility.rules";

export { stage1Common, stage1Detail, evaluateAll } from "./eligibility.rules";
export const typeLabel = (t: EligibilityTypeCode) => ELIGIBILITY_TYPE_LABEL[t];
export const baseYearNote = (t: EligibilityTypeCode) => BASE_YEAR_NOTE[t];

export interface GroupedResults {
  pass: EligibilityTypeResult[];
  needsMore: EligibilityTypeResult[];
  fail: EligibilityTypeResult[];
}

export function groupResults(results: EligibilityTypeResult[]): GroupedResults {
  return {
    pass: results.filter((r) => r.evaluation.status === "PASS"),
    needsMore: results.filter((r) => r.evaluation.status === "NEEDS_MORE"),
    fail: results.filter((r) => r.evaluation.status === "FAIL"),
  };
}

/** 1-1 후보 유형(=1-2 질문 대상). */
export function candidateTypes(common: EligibilityCommonInput): EligibilityTypeCode[] {
  return stage1Common(common).candidates;
}

/** 최종 신청 가능(PASS) 유형 코드 — 2단계 후보 주택 필터에 사용. */
export function passedTypes(
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): EligibilityTypeCode[] {
  return evaluateAll(common, detail)
    .filter((r) => r.evaluation.status === "PASS")
    .map((r) => r.type);
}
