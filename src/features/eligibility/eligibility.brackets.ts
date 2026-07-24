/** 스텝 C 범위 선택지 (docs/ELIGIBILITY_FRONTEND_SPEC.md §4-A/§4-B).
 *  대표값(repManwon) = 선택 구간의 상한(만원). 마지막 구간 = Infinity. */
import type { CarBand } from "./eligibility.types";

export interface Bracket {
  index: number;
  label: string;
  repManwon: number;
}

/** 가구원수별 월소득 5구간 (만원). 상한값 배열. */
const INCOME_UPPER: Record<number, number[]> = {
  1: [267, 343, 436, 458],
  2: [352, 469, 645, 672],
  3: [408, 572, 804, 817],
  4: [440, 616, 880, 974],
  5: [468, 655, 936, 1134],
  6: [495, 693, 991, 1283],
  7: [524, 734, 1049, 1427],
  8: [553, 775, 1106, 1571],
};

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function incomeBrackets(householdSize: number): Bracket[] {
  const n = Math.min(Math.max(householdSize, 1), 8);
  const u = INCOME_UPPER[n];
  return [
    { index: 0, label: `${fmt(u[0])}만원 이하`, repManwon: u[0] },
    { index: 1, label: `${fmt(u[0])} ~ ${fmt(u[1])}만원`, repManwon: u[1] },
    { index: 2, label: `${fmt(u[1])} ~ ${fmt(u[2])}만원`, repManwon: u[2] },
    { index: 3, label: `${fmt(u[2])} ~ ${fmt(u[3])}만원`, repManwon: u[3] },
    { index: 4, label: `${fmt(u[3])}만원 초과`, repManwon: Number.POSITIVE_INFINITY },
  ];
}

/** 총자산 8구간 (가구원수 무관, 만원). */
export const ASSET_BRACKETS: Bracket[] = [
  { index: 0, label: "3,000만원 이하", repManwon: 3000 },
  { index: 1, label: "3,000만 ~ 1억 800만원", repManwon: 10800 },
  { index: 2, label: "1억 800만 ~ 2억 4,500만원", repManwon: 24500 },
  { index: 3, label: "2억 4,500만 ~ 2억 5,100만원", repManwon: 25100 },
  { index: 4, label: "2억 5,100만 ~ 3억 3,700만원", repManwon: 33700 },
  { index: 5, label: "3억 3,700만 ~ 3억 4,500만원", repManwon: 34500 },
  { index: 6, label: "3억 4,500만 ~ 4억 500만원", repManwon: 40500 },
  { index: 7, label: "4억 500만원 초과", repManwon: Number.POSITIVE_INFINITY },
];

export const CAR_OPTIONS: { value: CarBand; label: string }[] = [
  { value: "NONE", label: "미보유" },
  { value: "UNDER_4542", label: "4,542만원 이하" },
  { value: "OVER", label: "4,542만원 초과" },
];
