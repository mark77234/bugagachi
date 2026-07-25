/** 1단계 자격 판정 도메인 타입. 값 로직 없음(순수 타입). */

export type EligibilityTypeCode =
  | "TONGHAP"
  | "HAENGBOK"
  | "JAEGAEBAL"
  | "MAEIP_ILBAN"
  | "MAEIP_CHUNG";

export const ELIGIBILITY_TYPE_LABEL: Record<EligibilityTypeCode, string> = {
  TONGHAP: "통합공공임대",
  HAENGBOK: "행복주택",
  JAEGAEBAL: "재개발임대",
  MAEIP_ILBAN: "매입임대 일반",
  MAEIP_CHUNG: "매입임대 청년",
};

export type EligibilityStatus = "PASS" | "FAIL" | "NEEDS_MORE";
export type IncomeStandard = "MEDIAN" | "URBAN";
export type HouseholderDef = "self" | "household"; // 무주택자 / 무주택세대구성원
export type CarBand = "NONE" | "UNDER_4542" | "OVER";
/** 주민등록상 세대구성원 관계. 형제자매·삼촌·조카 등은 세대구성원이 아니므로 받지 않는다. */
export type MemberRelation = "SELF" | "SPOUSE" | "PARENT" | "CHILD" | "FETUS";
export type BaseYear = 2026 | 2025;

export interface HouseholdMember {
  id: string;
  relation: MemberRelation;
  /** 표시용 세부 관계 (예: 아버지, 배우자 어머니). 자격 판정에는 인원수만 사용. */
  detail?: string;
}

/** 1-1 공통 입력 */
export interface EligibilityCommonInput {
  ownSelfHouse: boolean; // 스텝A: 본인 주택소유 (게이트)
  ownMemberHouse: boolean; // 세대원 유주택
  hasRestriction: boolean; // 제한이력(계약중·불법전대·재당첨)
  birthISO: string; // 스텝B
  ageYears: number; // 만나이 자동
  members: HouseholdMember[];
  householdSize: number; // 자동(1~8)
  /** 스텝C: 세대구성원 전원 합계 (선택 구간 대표값 = 상한, 만원). */
  incomeManwon: number;
  assetManwon: number; // 세대 총자산 대표값(만원)
  /** 스텝C: 본인 단독 값(만원). 청년 유형 판정용. 세대 1인이면 세대 값과 같다. */
  selfIncomeManwon: number;
  selfAssetManwon: number;
  carBand: CarBand;
  livesInBusan: boolean; // 스텝D
}

/** 1-2 유형별 세부 입력 */
export type TonghapTier = "청년" | "신혼한부모" | "고령자" | "일반";
export type HaengbokTier =
  | "대학생"
  | "청년"
  | "사회초년생"
  | "신혼한부모"
  | "고령자"
  | "주거급여";
export type StudentStatus = "재학" | "졸업2년내" | "소득활동5년내";
export type BirthCount = 0 | 1 | 2; // 2 = 2 이상

/**
 * 통합·행복이 공유하는 '계층' 다중선택 값.
 *
 * 계층은 택일 대상이 아니라 사실(속성)이다 — 만 65세 이상이면서 혼인 7년 이내면 고령자이자 신혼이다.
 * 그래서 유형별로 따로 묻지 않고 한 번만 받아 각 유형이 조회하고, 유형 안에서는 해당 계층을 모두 평가한다.
 */
export type TierAttr =
  | "대학생"
  | "청년"
  | "사회초년생"
  | "신혼한부모"
  | "고령자"
  | "수급주거급여"
  | "일반";

export const TIER_ATTR_LABEL: Record<TierAttr, string> = {
  대학생: "대학생",
  청년: "청년",
  사회초년생: "사회초년생",
  신혼한부모: "신혼·한부모",
  고령자: "고령자",
  수급주거급여: "수급·주거급여",
  일반: "일반",
};

/**
 * 공통 계층 입력. 후속값은 유형명이 아니라 **의미 단위**로 저장해 통합·행복이 함께 재사용한다
 * (신혼 유저가 두 유형 후보일 때 혼인개월·맞벌이를 두 번 묻지 않기 위함).
 */
export interface SharedTierInput {
  /** 다중선택 결과. 최소 1개 필수. */
  attrs: TierAttr[];
  /** '신혼·한부모' 체크 시 — 통합·행복 신혼 판정 공통 (0~84) */
  marriageMonths?: number;
  /** '신혼·한부모' 체크 시 — 통합 중180·행복 도120 가산 공통 */
  dualIncome?: boolean;
  /** '대학생'·'사회초년생' 체크 시 — 행복 대학생·사회초년생 전용 */
  studentStatus?: StudentStatus;
}

export interface EligibilityDetailInput {
  /** 통합공공임대·행복주택 공통 계층. 두 유형은 이 값을 조회만 한다. */
  tiers?: SharedTierInput;
  JAEGAEBAL?: { children: BirthCount };
  MAEIP_ILBAN?: { isRank1: boolean; children: BirthCount };
  MAEIP_CHUNG?: {
    isRank1: boolean;
    rank?: 2 | 3;
    parentIncomeManwon?: number;
    parentAssetManwon?: number;
  };
}

export interface EligibilityEvaluation {
  status: EligibilityStatus;
  reasons: string[]; // 사유(탈락/통과 근거)
  checkLater: string[]; // 실제 공고에서 재확인할 항목
}

export interface EligibilityTypeResult {
  type: EligibilityTypeCode;
  evaluation: EligibilityEvaluation;
  baseYear: BaseYear;
  /** 통과 판정에 쓰인 계층(복수 해당 시 가장 유리한 계층). */
  appliedTier?: string;
  /** 이 유형에서 함께 검토한 계층 전체. 1개면 생략. */
  evaluatedTiers?: string[];
}

/** 1-1 산출 결과 */
export interface Stage1Outcome {
  gate: string | null; // 즉시 종료 사유(본인 주택 소유 등)
  candidates: EligibilityTypeCode[]; // 후보(NEEDS_MORE 포함)
  perType: Record<EligibilityTypeCode, EligibilityEvaluation>;
}
