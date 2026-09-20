/** 2026 재개발임대 공고(2026.8.28) 컷 + 출산완화 재확인 자체 점검.
 *  실행: npm test (node --test, 별도 테스트 프레임워크 없음) */
import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAll, stage1Common, birthReliefAsks } from "./eligibility.rules.ts";
import type {
  BirthCount,
  BirthReliefAnswer,
  CarBand,
  EligibilityCommonInput,
} from "./eligibility.types.ts";

/** 부산 거주·무주택 2인 세대. 재개발임대 후보가 되는 최소 조건. */
function common(assetManwon: number, carBand: CarBand): EligibilityCommonInput {
  return {
    ownSelfHouse: false,
    ownMemberHouse: false,
    hasRestriction: false,
    birthISO: "1990-01-01",
    ageYears: 35,
    members: [
      { id: "self", relation: "SELF" },
      { id: "spouse", relation: "SPOUSE" },
    ],
    householdSize: 2,
    incomeManwon: 300,
    assetManwon,
    selfIncomeManwon: 300,
    selfAssetManwon: assetManwon,
    carBand,
    livesInBusan: true,
  };
}

function jaegaebal(
  input: EligibilityCommonInput,
  children: BirthCount,
  relief?: BirthReliefAnswer,
) {
  const results = evaluateAll(input, { JAEGAEBAL: { children, relief } });
  return results.find((r) => r.type === "JAEGAEBAL")!.evaluation;
}

test("2026 기준연도 — 재개발임대도 2026 공고", () => {
  const r = evaluateAll(common(3000, "NONE"), { JAEGAEBAL: { children: 0 } });
  assert.equal(r.find((x) => x.type === "JAEGAEBAL")!.baseYear, 2026);
});

test("출산 0인 — 2026 base 컷(3.45억 / 4,542만) 적용", () => {
  assert.equal(jaegaebal(common(34500, "UNDER_4542"), 0).status, "PASS");
  // 3.45억 초과 구간(대표값 4.05억)은 완화 없이 탈락
  assert.equal(jaegaebal(common(40500, "NONE"), 0).status, "FAIL");
  assert.equal(jaegaebal(common(3000, "OVER"), 0).status, "FAIL");
});

test("출산 1인 — base 컷 초과 항목만 재확인 문항이 뜬다", () => {
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", common(34500, "UNDER_4542"), 1), {});
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", common(40500, "OVER"), 1), {
    asset: 379_500_000,
    car: 49_960_000,
  });
  // 출산 0인은 완화가 없으므로 재확인하지 않는다
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", common(40500, "OVER"), 0), {});
});

test("출산 1인 — 재확인 '예' 통과, '아니오' 탈락, 무응답은 추가 입력 요구", () => {
  const input = common(40500, "OVER");
  assert.equal(jaegaebal(input, 1).status, "NEEDS_MORE");
  assert.equal(jaegaebal(input, 1, { asset: true, car: true }).status, "PASS");
  assert.equal(jaegaebal(input, 1, { asset: true, car: false }).status, "FAIL");
  assert.deepEqual(jaegaebal(input, 1, { asset: false, car: true }).reasons, [
    "총자산 기준을 초과했어요.",
  ]);
});

test("1-1 — 상한 미상 구간은 재개발·매입일반 후보로 남기고 1-2로 미룬다", () => {
  // 4,542만원 초과 차량: 통합·행복은 1-1 탈락, 출산완화가 있는 두 유형만 후보로 남는다
  const { candidates } = stage1Common(common(3000, "OVER"));
  assert.deepEqual(candidates.sort(), ["JAEGAEBAL", "MAEIP_ILBAN"]);
  // 완화 상한(출산2 = 5,450만원)마저 넘으면 1-2에서 탈락
  assert.equal(jaegaebal(common(3000, "OVER"), 2, { car: false }).status, "FAIL");
});
