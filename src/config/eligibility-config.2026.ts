/** 1단계 자격 기준 마스터 (Source of Truth: docs/ELIGIBILITY_FRONTEND_SPEC.md §5).
 *  모든 수치는 첨부 문서 원문. 화면 컴포넌트는 이 파일을 직접 참조하지 않고
 *  services/eligibility 함수 결과만 소비한다.
 *
 *  [불일치 C1] 행복 사회초년생 총자산: stage1_filter.py 코드=3.45억, 5-A/5-B 표=2.51억.
 *             → 표 2건 일치 → 2.51억 채택. 확정 시 이 주석 갱신.
 *  [불일치 C2] 통합 무주택'자'(self) 계층: 코드={청년,고령자단독}, 5-C 표=청년만 본인.
 *             → 표 기준(청년=self, 고령자=household) 채택.
 */
import type {
  EligibilityTypeCode,
  HouseholderDef,
  IncomeStandard,
} from "@/features/eligibility/eligibility.types";

const 만 = 10_000;

/** 소득 100% raw (원). §5-A */
export const INCOME_BASE_100: Record<IncomeStandard, Record<number, number>> = {
  MEDIAN: {
    1: 2_564_238,
    2: 4_199_292,
    3: 5_359_036,
    4: 6_494_738,
    5: 7_556_719,
    6: 8_555_952,
    7: 9_515_150,
    8: 10_474_348,
  },
  URBAN: {
    1: 3_813_363,
    2: 5_866_270,
    3: 8_168_429,
    4: 8_802_202,
    5: 9_362_985,
    6: 9_906_263,
    7: 10_485_541,
    8: 11_064_819, // 추정치
  },
};

/** 가구원수 가산율. §5-A */
export function gasan(n: number): number {
  if (n === 1) return 0.2;
  if (n === 2) return 0.1;
  return 0;
}

/** 소득상한(원) = base[n] × (배율 + 가산[n]) */
export function incomeCeiling(standard: IncomeStandard, size: number, multiplier: number): number {
  const n = Math.min(Math.max(size, 1), 8);
  return Math.round(INCOME_BASE_100[standard][n] * (multiplier + gasan(n)));
}

/** 자동차 대표값(원) */
export const CAR_VALUE = {
  NONE: 0,
  UNDER_4542: 45_420_000,
  OVER: Number.POSITIVE_INFINITY,
} as const;

/** 1-1 유형별 규칙. §5-B */
export interface Stage1Rule {
  incomeStandard: IncomeStandard;
  multiplierS1: number | null; // null → 1-1에서 소득 미판정(매입)
  dualAddS1: number; // n>=2 일 때 보수적으로 더하는 맞벌이 가산
  assetMax: number; // 원, 1-1용 최댓값
  carMax: number; // 원
  householderTier: boolean; // true면 세대원 유주택이어도 1-1 통과(1-2에서 확정)
  requireBusan: boolean;
  ageRange: [number, number] | null;
}

export const STAGE1_RULES: Record<EligibilityTypeCode, Stage1Rule> = {
  TONGHAP: {
    incomeStandard: "MEDIAN",
    multiplierS1: 1.5,
    dualAddS1: 0,
    assetMax: 345_000_000,
    carMax: 45_420_000,
    householderTier: true,
    requireBusan: false,
    ageRange: null,
  },
  HAENGBOK: {
    incomeStandard: "URBAN",
    multiplierS1: 1.0,
    dualAddS1: 0.2,
    assetMax: 345_000_000,
    carMax: 45_420_000,
    householderTier: true,
    requireBusan: false,
    ageRange: null,
  },
  JAEGAEBAL: {
    incomeStandard: "URBAN",
    multiplierS1: 0.7,
    dualAddS1: 0,
    assetMax: 405_000_000,
    carMax: 45_630_000,
    householderTier: false,
    requireBusan: true,
    ageRange: null,
  },
  MAEIP_ILBAN: {
    incomeStandard: "URBAN",
    multiplierS1: null,
    dualAddS1: 0,
    assetMax: 294_000_000,
    carMax: 54_500_000,
    householderTier: false,
    requireBusan: true,
    ageRange: null,
  },
  MAEIP_CHUNG: {
    incomeStandard: "URBAN",
    multiplierS1: null,
    dualAddS1: 0,
    assetMax: 345_000_000,
    carMax: 45_420_000,
    householderTier: true,
    requireBusan: false,
    ageRange: [19, 39],
  },
};

/** 1-2 계층/순위별 규칙 행. §5-C */
export interface Stage2Rule {
  incomeStandard: IncomeStandard;
  multiplier: number | null; // null → 소득 무관(자격확인)
  dualAdd: number; // dualIncome=true & 신혼한부모 일 때 추가
  asset: number | null; // 원, null → 자격확인
  car: number | null; // 원, 0 → 소유 불가, null → 자격확인
  householderDef: HouseholderDef;
}

/** 유형 → 계층/순위 key → 규칙 */
export const STAGE2_RULES: Record<string, Stage2Rule> = {
  // 통합공공임대
  "TONGHAP:일반": { incomeStandard: "MEDIAN", multiplier: 1.5, dualAdd: 0, asset: 345_000_000, car: 45_420_000, householderDef: "household" },
  "TONGHAP:청년": { incomeStandard: "MEDIAN", multiplier: 1.5, dualAdd: 0, asset: 345_000_000, car: 45_420_000, householderDef: "self" },
  "TONGHAP:고령자": { incomeStandard: "MEDIAN", multiplier: 1.5, dualAdd: 0, asset: 345_000_000, car: 45_420_000, householderDef: "household" },
  "TONGHAP:신혼한부모": { incomeStandard: "MEDIAN", multiplier: 1.5, dualAdd: 0.3, asset: 345_000_000, car: 45_420_000, householderDef: "household" },
  // 행복주택
  "HAENGBOK:대학생": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0, asset: 108_000_000, car: 0, householderDef: "self" },
  "HAENGBOK:청년": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0, asset: 251_000_000, car: 45_420_000, householderDef: "self" },
  "HAENGBOK:사회초년생": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0, asset: 251_000_000 /* [C1] */, car: 45_420_000, householderDef: "self" },
  "HAENGBOK:신혼한부모": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0.2, asset: 345_000_000, car: 45_420_000, householderDef: "household" },
  "HAENGBOK:고령자": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0, asset: 345_000_000, car: 45_420_000, householderDef: "household" },
  "HAENGBOK:주거급여": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0, asset: 345_000_000, car: 45_420_000, householderDef: "household" },
  // 매입임대 청년 (순위)
  "MAEIP_CHUNG:1": { incomeStandard: "URBAN", multiplier: null, dualAdd: 0, asset: null, car: null, householderDef: "self" },
  "MAEIP_CHUNG:2": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0, asset: 345_000_000, car: 45_420_000, householderDef: "self" },
  "MAEIP_CHUNG:3": { incomeStandard: "URBAN", multiplier: 1.0, dualAdd: 0, asset: 251_000_000, car: 45_420_000, householderDef: "self" },
  // 매입임대 일반 (순위) — 자산/자동차는 출산완화 표에서 결정
  "MAEIP_ILBAN:1": { incomeStandard: "URBAN", multiplier: null, dualAdd: 0, asset: null, car: null, householderDef: "household" },
  "MAEIP_ILBAN:2": { incomeStandard: "URBAN", multiplier: 0.5, dualAdd: 0, asset: null, car: null, householderDef: "household" },
};

/** 출산완화 자산/자동차 (원). index = min(children,2). §5-C */
export const BIRTH_RELIEF = {
  JAEGAEBAL: [
    { asset: 337_000_000, car: 38_030_000 },
    { asset: 371_000_000, car: 41_830_000 },
    { asset: 405_000_000, car: 45_630_000 },
  ],
  MAEIP_ILBAN: [
    { asset: 245_000_000, car: 45_420_000 },
    { asset: 269_000_000, car: 49_960_000 },
    { asset: 294_000_000, car: 54_500_000 },
  ],
} as const;

export { 만 };
