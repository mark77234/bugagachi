/**
 * 통합공공임대·행복주택 공통 계층 매핑·후속문항 규칙 (순수 함수).
 *
 * 두 유형은 계층이 겹치므로 계층을 유형별로 묻지 않고 공통 다중선택 1회로 받고,
 * 각 유형은 이 모듈을 통해 자기에게 유효한 계층만 조회한다.
 * 판정(소득·자산 컷)은 eligibility.rules.ts, 저장은 eligibility.store.ts가 담당한다.
 */
import type {
  EligibilityDetailInput,
  EligibilityTypeCode,
  HaengbokTier,
  SharedTierInput,
  TierAttr,
  TonghapTier,
} from "./eligibility.types";

/** '고령자' 자동 판정 기준 나이. 스텝 B에서 만 나이가 확정된 뒤에만 유효하다. */
export const SENIOR_AGE = 65;

/** 혼인 인정 상한(개월). 7년. */
export const MARRIAGE_MONTHS_MAX = 84;

/** 계층이 공통으로 묶이는 유형. 이 두 유형만 공통 계층 질문을 공유한다. */
export type SharedTierType = "TONGHAP" | "HAENGBOK";

export function isSharedTierType(type: EligibilityTypeCode): type is SharedTierType {
  return type === "TONGHAP" || type === "HAENGBOK";
}

/** 유저 체크값 → 유형별 내부 계층. 매핑에 없는 값은 그 유형에서 무시된다. */
const TONGHAP_MAP: Partial<Record<TierAttr, TonghapTier>> = {
  청년: "청년",
  신혼한부모: "신혼한부모",
  고령자: "고령자",
  일반: "일반",
  // 통합에는 주거급여 계층이 없다 — 일반 계층으로 조회한다.
  수급주거급여: "일반",
};

const HAENGBOK_MAP: Partial<Record<TierAttr, HaengbokTier>> = {
  대학생: "대학생",
  청년: "청년",
  사회초년생: "사회초년생",
  신혼한부모: "신혼한부모",
  고령자: "고령자",
  수급주거급여: "주거급여",
  // 행복에는 일반 계층이 없다.
};

/**
 * 평가·표시 순서 = 유리한 순.
 * 복수 계층에 해당하면 하나라도 통과하면 통과이고, 통과한 계층 중 앞선 것을 판정 계층으로 보여준다.
 * 신혼은 맞벌이 가산으로 소득 상한이 가장 높고, 청년·대학생은 본인 기준(세대 대신)이라 뒤로 둔다.
 */
const TONGHAP_ORDER: TonghapTier[] = ["신혼한부모", "고령자", "일반", "청년"];
const HAENGBOK_ORDER: HaengbokTier[] = [
  "신혼한부모",
  "고령자",
  "주거급여",
  "사회초년생",
  "청년",
  "대학생",
];

function pick<T extends string>(
  attrs: TierAttr[],
  map: Partial<Record<TierAttr, T>>,
  order: T[],
): T[] {
  const found = new Set<T>();
  for (const attr of attrs) {
    const tier = map[attr];
    if (tier) found.add(tier);
  }
  return order.filter((tier) => found.has(tier));
}

export function tonghapTiersOf(attrs: TierAttr[]): TonghapTier[] {
  return pick(attrs, TONGHAP_MAP, TONGHAP_ORDER);
}

export function haengbokTiersOf(attrs: TierAttr[]): HaengbokTier[] {
  return pick(attrs, HAENGBOK_MAP, HAENGBOK_ORDER);
}

/** 이 유형에서 유효한 계층 후보. 비어 있으면 선택한 상황에 해당하는 계층이 없다는 뜻. */
export function tierCandidates(type: SharedTierType, attrs: TierAttr[]): string[] {
  return type === "TONGHAP" ? tonghapTiersOf(attrs) : haengbokTiersOf(attrs);
}

/** 화면 노출 순서. */
const ATTR_ORDER: TierAttr[] = [
  "대학생",
  "청년",
  "사회초년생",
  "신혼한부모",
  "고령자",
  "수급주거급여",
  "일반",
];

/**
 * 이 후보 조합에서 의미가 있는 체크값만 남긴다(문항 최소화).
 * 예: 행복이 후보가 아니면 '대학생'·'사회초년생'은 어떤 유형에서도 계층이 되지 않으므로 묻지 않는다.
 */
export function relevantTierAttrs(candidates: EligibilityTypeCode[]): TierAttr[] {
  const shared = candidates.filter(isSharedTierType);
  return ATTR_ORDER.filter((attr) =>
    shared.some((type) => (type === "TONGHAP" ? TONGHAP_MAP : HAENGBOK_MAP)[attr] !== undefined),
  );
}

/** '신혼·한부모' 체크 시 혼인개월·맞벌이를 1회 수집한다(두 유형 공용). */
export function needsMarriageFollowUp(attrs: TierAttr[]): boolean {
  return attrs.includes("신혼한부모");
}

/** 재학상태는 행복 전용이므로 행복이 후보일 때만 묻는다. */
export function needsStudentFollowUp(attrs: TierAttr[], candidates: EligibilityTypeCode[]): boolean {
  if (!candidates.includes("HAENGBOK")) return false;
  return attrs.includes("대학생") || attrs.includes("사회초년생");
}

/** 체크 해제된 계층에 딸린 후속값을 초기화한다. */
export function pruneTierFollowUps(input: SharedTierInput): SharedTierInput {
  const next: SharedTierInput = { ...input };
  if (!needsMarriageFollowUp(input.attrs)) {
    delete next.marriageMonths;
    delete next.dualIncome;
  }
  if (!input.attrs.includes("대학생") && !input.attrs.includes("사회초년생")) {
    delete next.studentStatus;
  }
  return next;
}

/** 옛 유형별 계층(라디오) → 공통 계층 체크값. */
const LEGACY_TIER_TO_ATTR: Record<string, TierAttr> = {
  청년: "청년",
  신혼한부모: "신혼한부모",
  고령자: "고령자",
  일반: "일반",
  대학생: "대학생",
  사회초년생: "사회초년생",
  주거급여: "수급주거급여",
};

/**
 * 저장된 detail 을 공통 계층 모델로 옮긴다 (store persist v1 → v2).
 * detail.TONGHAP.tier / detail.HAENGBOK.tier 를 detail.tiers.attrs 로 합치고,
 * 후속값(혼인개월·맞벌이·재학상태)은 의미 단위 키로 옮겨 두 유형이 공유하게 한다.
 */
export function migrateLegacyTierDetail(raw: unknown): EligibilityDetailInput {
  const detail = { ...((raw ?? {}) as Record<string, unknown>) };
  const attrs: TierAttr[] = [];
  const follow: Omit<SharedTierInput, "attrs"> = {};

  for (const key of ["TONGHAP", "HAENGBOK"] as const) {
    const old = detail[key] as Record<string, unknown> | undefined;
    delete detail[key];
    if (!old) continue;
    const attr = LEGACY_TIER_TO_ATTR[String(old.tier)];
    if (attr && !attrs.includes(attr)) attrs.push(attr);
    if (typeof old.marriageMonths === "number") follow.marriageMonths = old.marriageMonths;
    if (typeof old.dualIncome === "boolean") follow.dualIncome = old.dualIncome;
    if (typeof old.studentStatus === "string") {
      follow.studentStatus = old.studentStatus as SharedTierInput["studentStatus"];
    }
  }

  if (attrs.length > 0) {
    (detail as EligibilityDetailInput).tiers = pruneTierFollowUps({ attrs, ...follow });
  }
  return detail as EligibilityDetailInput;
}

/**
 * 공통 계층 문항 입력 완료 여부. 화면의 '다음' 활성 조건과 판정의 NEEDS_MORE 조건을 한 곳에서 정한다.
 * candidates는 1-1 통과 후보 — 재학상태 필요 여부가 행복 후보인지에 달려 있다.
 */
export function tierStepComplete(
  shared: SharedTierInput | undefined,
  candidates: EligibilityTypeCode[],
): boolean {
  const attrs = shared?.attrs ?? [];
  if (attrs.length === 0) return false;
  if (needsMarriageFollowUp(attrs) && (shared!.marriageMonths === undefined || shared!.dualIncome === undefined)) {
    return false;
  }
  if (needsStudentFollowUp(attrs, candidates) && !shared!.studentStatus) return false;
  return true;
}
