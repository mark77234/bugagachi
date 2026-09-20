/** 유형별 기준연도 표기.
 *  공고는 유형마다 발표 시점이 달라, 아직 갱신되지 않은 유형이 생기면
 *  여기서 연도와 안내 문구만 내려 화면 배지·배너가 따라 붙는다.
 *  현재는 전 유형이 2026년 공고 기준(재개발임대 2026.8.28 공고 반영). */
import type { BaseYear, EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export const BASE_YEAR_BY_TYPE: Record<EligibilityTypeCode, BaseYear> = {
  TONGHAP: 2026,
  HAENGBOK: 2026,
  JAEGAEBAL: 2026,
  MAEIP_ILBAN: 2026,
  MAEIP_CHUNG: 2026,
};

export const BASE_YEAR_NOTE: Partial<Record<EligibilityTypeCode, string>> = {};
