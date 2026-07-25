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
import {
  MARRIAGE_MONTHS_MAX,
  isSharedTierType,
  needsMarriageFollowUp,
  needsStudentFollowUp,
  tierCandidates,
  type SharedTierType,
} from "./eligibility.tiers";
import {
  ELIGIBILITY_TYPE_LABEL,
  TIER_ATTR_LABEL,
  type EligibilityCommonInput,
  type EligibilityDetailInput,
  type EligibilityEvaluation,
  type EligibilityTypeCode,
  type EligibilityTypeResult,
  type SharedTierInput,
  type Stage1Outcome,
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

/** 내부 계층명 → 표시 라벨. */
function tierLabel(tier: string): string {
  if (tier === "주거급여") return "주거급여수급자";
  return TIER_ATTR_LABEL[tier as keyof typeof TIER_ATTR_LABEL] ?? tier;
}

/** 한 계층 기준 판정 결과. reasons가 비면 그 계층으로 통과. */
interface TierVerdict {
  tier: string;
  reasons: string[];
}

/** 세부 판정 결과 + 어떤 계층으로 판정했는지. */
interface DetailVerdict {
  evaluation: EligibilityEvaluation;
  appliedTier?: string;
  evaluatedTiers?: string[];
}

/** 통합공공임대 — 계층 하나를 기준으로 소득·자산·자동차 컷 심사. */
function judgeTonghapTier(
  common: EligibilityCommonInput,
  tier: string,
  shared: SharedTierInput,
): TierVerdict {
  const rule = STAGE2_RULES[`TONGHAP:${tier}`];
  const reasons: string[] = [];
  const basis = basisOf(common, rule.householderDef);
  if (rule.householderDef === "household" && common.ownMemberHouse) {
    reasons.push("무주택 세대구성원 조건에 어긋나요.");
  }
  const isNewlywed = tier === "신혼한부모";
  if (isNewlywed && (shared.marriageMonths ?? 0) > MARRIAGE_MONTHS_MAX) {
    reasons.push(`혼인 ${MARRIAGE_MONTHS_MAX}개월(7년)을 초과했어요.`);
  }
  const mult = rule.multiplier! + (isNewlywed && shared.dualIncome ? rule.dualAdd : 0);
  if (basis.incomeWon > incomeCeiling(rule.incomeStandard, basis.size, mult)) {
    reasons.push("중위소득 기준을 초과했어요.");
  }
  if (rule.asset !== null && basis.assetWon > rule.asset) reasons.push("총자산 기준을 초과했어요.");
  if (rule.car !== null && CAR_VALUE[common.carBand] > rule.car) {
    reasons.push("자동차 가액 기준을 초과했어요.");
  }
  return { tier, reasons };
}

/** 행복주택 — 계층 하나를 기준으로 심사. 대학생 계층은 자동차 보유 자체가 불가. */
function judgeHaengbokTier(
  common: EligibilityCommonInput,
  tier: string,
  shared: SharedTierInput,
): TierVerdict {
  const rule = STAGE2_RULES[`HAENGBOK:${tier}`];
  const reasons: string[] = [];
  const basis = basisOf(common, rule.householderDef);
  const carVal = CAR_VALUE[common.carBand];
  if (rule.householderDef === "household" && common.ownMemberHouse) {
    reasons.push("무주택 세대구성원 조건에 어긋나요.");
  }
  if (rule.asset !== null && basis.assetWon > rule.asset) reasons.push("계층 총자산 기준을 초과했어요.");
  if (rule.car === 0) {
    if (carVal > 0) reasons.push("대학생 계층은 자동차를 소유할 수 없어요.");
  } else if (rule.car !== null && carVal > rule.car) {
    reasons.push("자동차 가액 기준을 초과했어요.");
  }
  const isNewlywed = tier === "신혼한부모";
  if (isNewlywed && (shared.marriageMonths ?? 0) > MARRIAGE_MONTHS_MAX) {
    reasons.push(`혼인 ${MARRIAGE_MONTHS_MAX}개월(7년)을 초과했어요.`);
  }
  const mult = rule.multiplier! + (isNewlywed && shared.dualIncome ? rule.dualAdd : 0);
  if (basis.incomeWon > incomeCeiling(rule.incomeStandard, basis.size, mult)) {
    reasons.push("도시근로자 소득 기준을 초과했어요.");
  }
  return { tier, reasons };
}

/**
 * 통합·행복 세부 판정. 공통 계층 다중선택에서 이 유형에 유효한 계층을 모두 평가하고,
 * **하나라도 통과하면 그 유형 통과**로 본다(가장 유리한 계층으로 판정).
 */
function judgeSharedTierType(
  type: SharedTierType,
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): DetailVerdict {
  const shared = detail.tiers;
  const attrs = shared?.attrs ?? [];
  if (!shared || attrs.length === 0) {
    return { evaluation: needMore("해당하는 상황을 최소 1개 선택해 주세요.") };
  }

  const tiers = tierCandidates(type, attrs);
  if (tiers.length === 0) {
    // 예: '대학생'만 골랐는데 통합이 후보 — 통합에는 대학생 계층이 없다.
    return {
      evaluation: {
        status: "FAIL",
        reasons: [`선택한 상황에 해당하는 ${ELIGIBILITY_TYPE_LABEL[type]} 계층이 없어요.`],
        checkLater: [],
      },
    };
  }

  // 후속 문항이 비어 있으면 아직 판정할 수 없다.
  if (needsMarriageFollowUp(attrs) && (shared.marriageMonths === undefined || shared.dualIncome === undefined)) {
    return { evaluation: needMore("혼인 개월과 맞벌이 여부를 입력해 주세요.") };
  }
  if (needsStudentFollowUp(attrs, [type]) && !shared.studentStatus) {
    return { evaluation: needMore("현재 상태(재학·졸업·소득활동)를 선택해 주세요.") };
  }

  const verdicts = tiers.map((tier) =>
    type === "TONGHAP" ? judgeTonghapTier(common, tier, shared) : judgeHaengbokTier(common, tier, shared),
  );
  const evaluatedTiers = verdicts.map((v) => tierLabel(v.tier));
  const checkLater: string[] = [GENERIC_CHECK];
  if (tiers.some((tier) => tier === "대학생" || tier === "사회초년생")) {
    checkLater.push("재학·졸업·소득활동 상태는 공고 기준으로 다시 확인해요.");
  }

  const passed = verdicts.find((v) => v.reasons.length === 0);
  if (passed) {
    return {
      evaluation: {
        status: "PASS",
        reasons: [
          verdicts.length > 1
            ? `${tierLabel(passed.tier)} 계층 기준으로 세부 자격을 충족해요.`
            : "세부 자격 조건을 충족해요.",
        ],
        checkLater,
      },
      appliedTier: tierLabel(passed.tier),
      evaluatedTiers,
    };
  }

  // 전부 탈락 — 계층이 여럿이면 어느 계층에서 왜 걸렸는지 함께 보여준다.
  const reasons =
    verdicts.length === 1
      ? verdicts[0].reasons
      : verdicts.map((v) => `${tierLabel(v.tier)} 계층: ${v.reasons.join(" ")}`);
  return { evaluation: { status: "FAIL", reasons, checkLater }, evaluatedTiers };
}

/** 1-2 유형별 세부 판정. common은 1-1 통과 입력, detail은 유형별 답변. */
export function stage1Detail(
  type: EligibilityTypeCode,
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): EligibilityEvaluation {
  return judgeDetail(type, common, detail).evaluation;
}

function judgeDetail(
  type: EligibilityTypeCode,
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): DetailVerdict {
  if (isSharedTierType(type)) return judgeSharedTierType(type, common, detail);
  return { evaluation: judgeSingleType(type, common, detail), appliedTier: singleTypeTier(type, common, detail) };
}

/** 계층을 공유하지 않는 유형(재개발·매입일반·매입청년)의 세부 판정. */
function judgeSingleType(
  type: Exclude<EligibilityTypeCode, SharedTierType>,
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
    // 통합·행복은 공통 계층 답변을, 나머지는 유형별 답변을 본다.
    const hasDetail = isSharedTierType(type)
      ? Boolean(detail.tiers?.attrs.length)
      : Boolean((detail as Record<string, unknown>)[type]);
    if (!hasDetail) {
      return { type, evaluation: s1.perType[type], baseYear }; // NEEDS_MORE
    }
    const { evaluation, appliedTier, evaluatedTiers } = judgeDetail(type, common, detail);
    return { type, evaluation, baseYear, appliedTier, evaluatedTiers };
  });
}

function singleTypeTier(
  type: Exclude<EligibilityTypeCode, SharedTierType>,
  common: EligibilityCommonInput,
  detail: EligibilityDetailInput,
): string | undefined {
  switch (type) {
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
