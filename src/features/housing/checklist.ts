/** 신청 준비 체크리스트 — 유형별 준비 항목. 실제 신청 전 확인/준비 사항을 안내한다.
 *  체크 상태는 userStore(localStorage)에 주택별로 저장된다. */
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

const COMMON: ChecklistItem[] = [
  { id: "no-house", label: "무주택 세대 구성 요건 확인", hint: "세대 전원 무주택인지 등본으로 확인해요." },
  { id: "income-asset", label: "가구 소득·자산 증빙 서류 준비", hint: "건강보험료 납부확인서, 금융·부동산 자료 등." },
  { id: "id-docs", label: "신분증·주민등록등본(세대원 포함) 준비" },
  { id: "notice", label: "공고문에서 신청 자격·순위 다시 확인", hint: "이 서비스 판정은 참고용이에요." },
  { id: "period", label: "신청 기간·접수 방법 확인" },
];

const SUBSCRIPTION: ChecklistItem = {
  id: "subscription",
  label: "주택청약종합저축 가입·납입 확인",
  hint: "통합공공임대·재개발임대 등에서 순위 산정에 쓰여요.",
};

/** 유형별 체크리스트 (공통 + 유형 특화). */
export function applicationChecklist(type: EligibilityTypeCode): ChecklistItem[] {
  const items = [...COMMON];
  if (type === "TONGHAP" || type === "JAEGAEBAL") {
    items.splice(3, 0, SUBSCRIPTION);
  }
  if (type === "MAEIP_CHUNG") {
    items.splice(3, 0, { id: "youth-age", label: "만 19~39세 연령 요건 확인" });
  }
  if (type === "JAEGAEBAL") {
    items.push({ id: "birth-2023", label: "2023.3.28 이후 출산·입양·태아 서류 확인" });
  }
  return items;
}
