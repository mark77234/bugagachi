/** 재개발임대 전용 기준연도 표기.
 *  재개발임대는 2026년 공고가 미발표되어 2025년 공고 기준을 사용한다.
 *  실제 수치(자산/자동차 출산완화)는 eligibility-config.2026.ts 의 BIRTH_RELIEF.JAEGAEBAL 에
 *  이미 2025 기준으로 반영되어 있다. 이 파일은 기준연도 메타데이터만 제공한다. */
import type { BaseYear, EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export const BASE_YEAR_BY_TYPE: Record<EligibilityTypeCode, BaseYear> = {
  TONGHAP: 2026,
  HAENGBOK: 2026,
  JAEGAEBAL: 2025, // 2026 공고 미발표
  MAEIP_ILBAN: 2026,
  MAEIP_CHUNG: 2026,
};

export const BASE_YEAR_NOTE: Partial<Record<EligibilityTypeCode, string>> = {
  JAEGAEBAL: "2026년 공고가 아직 발표되지 않아 2025년 공고 기준으로 안내해요.",
};
