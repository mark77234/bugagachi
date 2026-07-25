/** 1단계 자격 판정 순수함수. docs/ELIGIBILITY_FRONTEND_SPEC.md §6 (stage1_filter.py 동치).
 *  화면과 결합 없음. 입력은 만원 단위, config는 원 단위 → 내부에서 변환. */
import {
  BIRTH_RELIEF,
  CAR_VALUE,
  STAGE1_RULES,
  STAGE2_RULES,
  incomeCeiling,
} from "@/config/eligibility-config.2026";
import { BASE_YEAR_BY_TYPE } from "@/config/eligibility-config.2025";
import type {
  EligibilityCommonInput,
  EligibilityDetailInput,
  EligibilityEvaluation,
  EligibilityTypeCode,
  EligibilityTypeResult,
  Stage1Outcome,
} from "./eligibility.types";

const ALL_TYPES: EligibilityTypeCode[] = [
  "TONGHAP",
  "HAENGBOK",
  "JAEGAEBAL",
  "MAEIP_ILBAN",
  "MAEIP_CHUNG",
];

const won = (manwon: number) => Math.round((manwon || 0) * 10_000);

/** 소득·자산 심사 기준. 청년 계층은 '본인'만, 그 외는 '세대 전원'을 본다.
 *  본인 기준일 때 소득 상한은 1인 가구 기준을 쓴다. */
interface AmountBasis {
  incomeWon: number;
  assetWon: number;
  size: number;
}

function basisOf(common: EligibilityCommonInput, def: "self" | "household"): AmountBasis {
  const size = Math.min(Math.max(common.householdSize, 1), 8);
  return def === "self"
    ? { incomeWon: won(common.selfIncomeManwon), assetWon: won(common.selfAssetManwon), size: 1 }
    : { incomeWon: won(common.incomeManwon), assetWon: won(common.assetManwon), size };
}

/** 1-1 시점에는 계층이 아직 정해지지 않았다. '본인' 계층을 가진 유형은
 *  본인 기준으로도 통과 가능하므로 두 기준 중 유리한 쪽으로 후보를 남긴다. */
const HAS_SELF_TIER: Record<EligibilityTypeCode, boolean> = {
  TONGHAP: true,
  HAENGBOK: true,
  JAEGAEBAL: false,
  MAEIP_ILBAN: false,
  MAEIP_CHUNG: true,
};

/** 1-1 공통 자격 필터. 후보(=1-2 진행 대상)와 제외 유형을 산출. */
export function stage1Common(input: EligibilityCommonInput): Stage1Outcome {
  const perType = {} as Record<EligibilityTypeCode, EligibilityEvaluation>;

  // 게이트: 본인 주택 소유 → 전 유형 불가
  if (input.ownSelfHouse) {
    for (const t of ALL_TYPES) {
      perType[t] = {
        status: "FAIL",
        reasons: ["본인 명의 주택을 소유하고 있어 신청할 수 없어요."],
        checkLater: [],
      };
    }
    return { gate: "본인 명의 주택 소유 (전 유형 신청 불가)", candidates: [], perType };
  }

  const allHouseholdOwnerless = !input.ownMemberHouse;
  const carVal = CAR_VALUE[input.carBand];
  const candidates: EligibilityTypeCode[] = [];

  for (const t of ALL_TYPES) {
    const r = STAGE1_RULES[t];
    const reasons: string[] = [];

    // 소득·자산은 세대 기준으로 보되, 본인 계층이 있는 유형은 본인 기준도 함께 본다.
    const bases: AmountBasis[] = [basisOf(input, "household")];
    if (HAS_SELF_TIER[t]) bases.push(basisOf(input, "self"));

    const assetOk = bases.some((b) => b.assetWon <= r.assetMax);
    const incomeOk =
      r.multiplierS1 === null ||
      bases.some((b) => {
        const dual = b.size >= 2 ? r.dualAddS1 : 0;
        return b.incomeWon <= incomeCeiling(r.incomeStandard, b.size, r.multiplierS1! + dual);
      });

    if (!assetOk) reasons.push("총자산 기준을 초과했어요.");
    if (carVal > r.carMax) reasons.push("자동차 가액 기준을 초과했어요.");
    if (!incomeOk) reasons.push("월평균 소득 기준을 초과했어요.");
    if (!allHouseholdOwnerless && !r.householderTier) reasons.push("세대원 중 주택 소유자가 있어요.");
    if (r.requireBusan && !input.livesInBusan) reasons.push("부산 외 거주로 대상이 아니에요.");
    if (r.ageRange && !(input.ageYears >= r.ageRange[0] && input.ageYears <= r.ageRange[1])) {
      reasons.push(`만 ${r.ageRange[0]}~${r.ageRange[1]}세 대상이에요.`);
    }

    if (reasons.length === 0) {
      candidates.push(t);
      perType[t] = {
        status: "NEEDS_MORE",
        reasons: ["공통 자격은 충족했어요. 세부 조건 확인이 필요해요."],
        checkLater: [],
      };
    } else {
      perType[t] = { status: "FAIL", reasons, checkLater: [] };
    }
  }

  return { gate: null, candidates, perType };
}

const GENERIC_CHECK = "실제 소득·자산·세대 구성은 모집공고 제출 서류로 최종 확정돼요.";

/** 1-2 유형별 세부 판정. common은 1-1 통과 입력, detail은 유형별 답변. */
export function stage1Detail(
  type: EligibilityTypeCode,
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): EligibilityEvaluation {
  const size = Math.min(Math.max(common.householdSize, 1), 8);
  const household = basisOf(common, "household");
  const assetWon = household.assetWon;
  const incomeWon = household.incomeWon;
  const carVal = CAR_VALUE[common.carBand];
  const reasons: string[] = [];
  const checkLater: string[] = [GENERIC_CHECK];

  const checkHouseholder = (def: "self" | "household") => {
    if (def === "household" && common.ownMemberHouse) reasons.push("무주택 세대구성원 조건에 어긋나요.");
  };

  if (type === "TONGHAP") {
    const d = detail.TONGHAP;
    if (!d?.tier) return needMore("계층을 선택해 주세요.");
    if (d.tier === "신혼한부모" && (!d.marriageMonths || d.dualIncome === undefined))
      return needMore("혼인 개월과 맞벌이 여부를 입력해 주세요.");
    const rule = STAGE2_RULES[`TONGHAP:${d.tier}`];
    checkHouseholder(rule.householderDef);
    const basis = basisOf(common, rule.householderDef);
    const isNewlywed = d.tier === "신혼한부모";
    if (isNewlywed && (d.marriageMonths ?? 0) > 84) reasons.push("혼인 84개월(7년)을 초과했어요.");
    const mult = rule.multiplier! + (isNewlywed && d.dualIncome ? rule.dualAdd : 0);
    if (basis.incomeWon > incomeCeiling(rule.incomeStandard, basis.size, mult))
      reasons.push("중위소득 기준을 초과했어요.");
    if (rule.asset !== null && basis.assetWon > rule.asset) reasons.push("총자산 기준을 초과했어요.");
    if (rule.car !== null && carVal > rule.car) reasons.push("자동차 가액 기준을 초과했어요.");
    return finalize(reasons, checkLater, d.tier);
  }

  if (type === "HAENGBOK") {
    const d = detail.HAENGBOK;
    if (!d?.tier) return needMore("계층을 선택해 주세요.");
    if ((d.tier === "대학생" || d.tier === "사회초년생") && !d.studentStatus)
      return needMore("현재 상태를 선택해 주세요.");
    if (d.tier === "신혼한부모" && (!d.marriageMonths || d.dualIncome === undefined))
      return needMore("혼인 개월과 맞벌이 여부를 입력해 주세요.");
    const rule = STAGE2_RULES[`HAENGBOK:${d.tier}`];
    checkHouseholder(rule.householderDef);
    const basis = basisOf(common, rule.householderDef);
    if (rule.asset !== null && basis.assetWon > rule.asset) reasons.push("계층 총자산 기준을 초과했어요.");
    if (rule.car === 0) {
      if (carVal > 0) reasons.push("대학생 계층은 자동차를 소유할 수 없어요.");
    } else if (rule.car !== null && carVal > rule.car) {
      reasons.push("자동차 가액 기준을 초과했어요.");
    }
    const isNewlywed = d.tier === "신혼한부모";
    const mult = rule.multiplier! + (isNewlywed && d.dualIncome ? rule.dualAdd : 0);
    if (basis.incomeWon > incomeCeiling(rule.incomeStandard, basis.size, mult))
      reasons.push("도시근로자 소득 기준을 초과했어요.");
    if (d.tier === "대학생" || d.tier === "사회초년생") {
      checkLater.push("재학·졸업·소득활동 상태는 공고 기준으로 다시 확인해요.");
    }
    return finalize(reasons, checkLater, d.tier);
  }

  if (type === "JAEGAEBAL") {
    const d = detail.JAEGAEBAL;
    if (!d || d.children === undefined) return needMore("출산 자녀 수를 선택해 주세요.");
    checkHouseholder("household");
    const relief = BIRTH_RELIEF.JAEGAEBAL[Math.min(d.children, 2)];
    if (assetWon > relief.asset) reasons.push("총자산 기준을 초과했어요.");
    if (carVal > relief.car) reasons.push("자동차 가액 기준을 초과했어요.");
    checkLater.push("2023.3.28 이후 출산·입양·태아 여부는 서류로 확인해요.");
    return finalize(reasons, checkLater, `출산 ${d.children === 2 ? "2명 이상" : `${d.children}명`}`);
  }

  if (type === "MAEIP_ILBAN") {
    const d = detail.MAEIP_ILBAN;
    if (!d || d.isRank1 === undefined || d.children === undefined)
      return needMore("1순위 여부와 출산 자녀 수를 선택해 주세요.");
    checkHouseholder("household");
    const relief = BIRTH_RELIEF.MAEIP_ILBAN[Math.min(d.children, 2)];
    if (assetWon > relief.asset) reasons.push("총자산 기준을 초과했어요.");
    if (carVal > relief.car) reasons.push("자동차 가액 기준을 초과했어요.");
    if (!d.isRank1) {
      if (incomeWon > incomeCeiling("URBAN", size, 0.5)) reasons.push("2순위 소득(도시근로자 50%) 기준을 초과했어요.");
    } else {
      checkLater.push("1순위 자격(수급·한부모·차상위·65세·장애인)은 서류로 확인해요.");
    }
    return finalize(reasons, checkLater, d.isRank1 ? "1순위" : "2순위");
  }

  // MAEIP_CHUNG — 청년 유형이므로 소득·자산은 '본인' 기준으로 본다.
  const d = detail.MAEIP_CHUNG;
  if (!d || d.isRank1 === undefined) return needMore("1순위 여부와 심사 순위를 선택해 주세요.");
  if (!(common.ageYears >= 19 && common.ageYears <= 39)) reasons.push("만 19~39세 대상이에요.");
  if (d.isRank1) {
    checkLater.push("1순위 자격(수급·한부모·차상위)은 서류로 확인해요.");
    return finalize(reasons, checkLater, "1순위");
  }
  if (!d.rank) return needMore("심사 순위를 선택해 주세요.");
  if (d.rank === 2 && (d.parentIncomeManwon === undefined || d.parentAssetManwon === undefined))
    return needMore("부모 월소득과 총자산을 입력해 주세요.");
  const self = basisOf(common, "self");
  if (d.rank === 2) {
    if (rank2Qualifies(common, d.parentIncomeManwon, d.parentAssetManwon)) {
      return finalize(reasons, checkLater, "2순위 (부모 합산)");
    }
    checkLater.push("부모 포함 2순위 기준을 넘어 본인 기준 3순위로 자동 확인했어요.");
  }
  // rank 3 — 본인 소득·자산만 심사
  if (self.incomeWon > incomeCeiling("URBAN", 1, 1.0)) reasons.push("3순위 소득 기준을 초과했어요.");
  if (self.assetWon > 251_000_000) reasons.push("3순위 자산 기준을 초과했어요.");
  return finalize(reasons, checkLater, "3순위 (본인 심사)");
}

/** 매입임대 청년 2순위: 본인 + 부모 합산이 도시근로자 100%·자산 3.45억 이내인지. */
function rank2Qualifies(
  common: EligibilityCommonInput,
  parentIncomeManwon?: number,
  parentAssetManwon?: number,
): boolean {
  if (parentIncomeManwon === undefined || parentAssetManwon === undefined) return false;
  const self = basisOf(common, "self");
  const size = Math.min(Math.max(common.householdSize, 1), 8);
  return (
    self.incomeWon + won(parentIncomeManwon) <= incomeCeiling("URBAN", size, 1.0) &&
    self.assetWon + won(parentAssetManwon) <= 345_000_000
  );
}

function needMore(msg: string): EligibilityEvaluation {
  return { status: "NEEDS_MORE", reasons: [msg], checkLater: [] };
}

function finalize(reasons: string[], checkLater: string[], tier?: string): EligibilityEvaluation {
  void tier;
  return reasons.length > 0
    ? { status: "FAIL", reasons, checkLater }
    : { status: "PASS", reasons: ["세부 자격 조건을 충족해요."], checkLater };
}

/** 1-1 + 1-2 전체 판정 → 유형별 최종 결과. detail이 없는 후보는 NEEDS_MORE로 남는다. */
export function evaluateAll(
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): EligibilityTypeResult[] {
  const s1 = stage1Common(common);
  return ALL_TYPES.map((type) => {
    const baseYear = BASE_YEAR_BY_TYPE[type];
    if (s1.perType[type].status === "FAIL") {
      return { type, evaluation: s1.perType[type], baseYear };
    }
    const hasDetail = Boolean((detail as Record<string, unknown>)[type]);
    if (!hasDetail) {
      return { type, evaluation: s1.perType[type], baseYear }; // NEEDS_MORE
    }
    const evaluation = stage1Detail(type, common, detail);
    const appliedTier = detailTierLabel(type, common, detail);
    return { type, evaluation, baseYear, appliedTier };
  });
}

function detailTierLabel(
  type: EligibilityTypeCode,
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): string | undefined {
  switch (type) {
    case "TONGHAP":
      return detail.TONGHAP?.tier;
    case "HAENGBOK":
      return detail.HAENGBOK?.tier;
    case "MAEIP_CHUNG": {
      const youth = detail.MAEIP_CHUNG;
      if (youth?.isRank1) return "1순위";
      if (youth?.rank === 2) {
        if (youth.parentIncomeManwon === undefined || youth.parentAssetManwon === undefined) return undefined;
        if (rank2Qualifies(common, youth.parentIncomeManwon, youth.parentAssetManwon)) return "2순위";
      }
      return youth?.rank ? "3순위" : undefined;
    }
    case "MAEIP_ILBAN":
      return detail.MAEIP_ILBAN?.isRank1 ? "1순위" : "2순위";
    default:
      return undefined;
  }
}

export { ALL_TYPES };
