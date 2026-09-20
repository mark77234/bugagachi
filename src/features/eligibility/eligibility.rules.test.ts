/** 2026 재개발임대 공고(2026.8.28) 컷 + 출산완화 재확인 자체 점검.
 *  실행: npm test (node --test, 별도 테스트 프레임워크 없음)
 *
 *  금액 단위 주의 — config 는 원, 입력(EligibilityCommonInput)은 만원이다.
 *  1-1 총자산은 '금액 직접 입력'(정확값)과 '구간 선택'(대표값 = 구간 상한) 두 경로가 있어
 *  두 경로를 모두 검증한다. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BIRTH_RELIEF, CAR_VALUE, STAGE1_RULES, STAGE2_RULES } from "@/config/eligibility-config.2026";
import { ASSET_BRACKETS, bracketIndexForValue } from "./eligibility.brackets.ts";
import {
  evaluateAll,
  stage1Common,
  birthReliefAsks,
  type BirthReliefType,
} from "./eligibility.rules.ts";
import type {
  BirthCount,
  BirthReliefAnswer,
  CarBand,
  EligibilityCommonInput,
  EligibilityStatus,
  EligibilityTypeCode,
} from "./eligibility.types.ts";

const 억 = 10_000; // 만원 단위

/** 부산 거주·무주택 2인 세대, 소득 여유. 자산·자동차만 바꿔 가며 본다. */
function common(opts: {
  assetManwon: number;
  assetIsExact?: boolean;
  carBand?: CarBand;
  incomeManwon?: number;
}): EligibilityCommonInput {
  const assetManwon = opts.assetManwon;
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
    incomeManwon: opts.incomeManwon ?? 300,
    assetManwon,
    assetIsExact: opts.assetIsExact ?? true,
    selfIncomeManwon: opts.incomeManwon ?? 300,
    selfAssetManwon: assetManwon,
    carBand: opts.carBand ?? "NONE",
    livesInBusan: true,
  };
}

/** 스텝C에서 '금액을 모르면 범위로 선택'을 쓴 세대 — 대표값은 구간 상한. */
function byBracket(actualManwon: number, carBand?: CarBand): EligibilityCommonInput {
  const rep = ASSET_BRACKETS[bracketIndexForValue(actualManwon, ASSET_BRACKETS)].repManwon;
  return common({ assetManwon: rep, assetIsExact: false, carBand });
}

function judge(
  type: BirthReliefType,
  input: EligibilityCommonInput,
  children: BirthCount,
  relief?: BirthReliefAnswer,
): EligibilityStatus {
  const detail =
    type === "JAEGAEBAL"
      ? { JAEGAEBAL: { children, relief } }
      : { MAEIP_ILBAN: { isRank1: true as const, children, relief } };
  return evaluateAll(input, detail).find((r) => r.type === type)!.evaluation.status;
}

const status = (input: EligibilityCommonInput, type: EligibilityTypeCode, detail = {}) =>
  evaluateAll(input, detail).find((r) => r.type === type)!.evaluation.status;

// ─── 구조 불변식 ────────────────────────────────────────────────────────────
// 구간 선택 경로가 '보수적 탈락'이 아니라 '정확'하려면, 재확인 문항이 없는 컷(=출산0 기본
// 컷과 계층별 컷)이 전부 구간 경계여야 한다. 경계면 어떤 구간도 컷을 가로지르지 않는다.

test("재확인 없이 쓰이는 자산 컷은 모두 ASSET_BRACKETS 경계다", () => {
  const bounds = new Set(ASSET_BRACKETS.map((b) => b.repManwon * 10_000));
  const cuts = [
    ...Object.values(STAGE2_RULES).map((r) => r.asset),
    ...Object.values(BIRTH_RELIEF).map((t) => t[0].asset), // 출산0 = 재확인 없는 기본 컷
  ].filter((v): v is number => v !== null);
  for (const cut of new Set(cuts)) {
    assert.ok(bounds.has(cut), `${cut}원 컷이 구간 경계에 없어 구간 선택 시 오판할 수 있어요`);
  }
});

test("자동차 3단 경계는 전 유형 기본 컷과 같다 (구간 자체로 정확)", () => {
  const carCuts = [
    ...Object.values(STAGE1_RULES).map((r) => r.carMax),
    ...Object.values(STAGE2_RULES).map((r) => r.car),
    ...Object.values(BIRTH_RELIEF).map((t) => t[0].car),
  ].filter((v): v is number => v !== null && v !== 0);
  // 기본 컷은 전부 4,542만원 — 선택지 경계와 일치한다. 그보다 높은 값은 출산완화 컷뿐이라
  // '초과' 구간(상한 미상)이 1-2 재확인으로 해결된다.
  const base = carCuts.filter((c) => c <= CAR_VALUE.UNDER_4542);
  assert.deepEqual([...new Set(base)], [CAR_VALUE.UNDER_4542]);
  assert.ok(carCuts.every((c) => c === CAR_VALUE.UNDER_4542 || c > CAR_VALUE.UNDER_4542));
});

// ─── 신고된 반례 재현 시도 ──────────────────────────────────────────────────

test("실제 3.40억·출산0 재개발 신청자는 구간 선택으로도 통과한다", () => {
  const input = byBracket(3.4 * 억);
  // 3.37억~3.45억 구간이 있어 대표값이 곧 기본 컷 3.45억이다
  assert.equal(input.assetManwon, 3.45 * 억);
  assert.equal(judge("JAEGAEBAL", input, 0), "PASS");
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", input, 0), {}, "출산0에는 완화 문항이 없어야 한다");
});

// ─── 자산 경계: 출산 0 / 1 / 2 ──────────────────────────────────────────────

test("출산0 자산 경계 — 3.45억 이하 통과, 초과 탈락 (정확 입력)", () => {
  assert.equal(judge("JAEGAEBAL", common({ assetManwon: 3.449999 * 억 }), 0), "PASS");
  assert.equal(judge("JAEGAEBAL", common({ assetManwon: 3.45 * 억 }), 0), "PASS");
  assert.equal(judge("JAEGAEBAL", common({ assetManwon: 3.450001 * 억 }), 0), "FAIL");
});

test("출산0 자산 경계 — 구간 선택 경로도 같은 결과", () => {
  assert.equal(judge("JAEGAEBAL", byBracket(3.449999 * 억), 0), "PASS");
  assert.equal(judge("JAEGAEBAL", byBracket(3.45 * 억), 0), "PASS");
  assert.equal(judge("JAEGAEBAL", byBracket(3.450001 * 억), 0), "FAIL");
});

test("출산1 자산 경계 — 3.795억 이하 통과, 초과 탈락 (정확 입력은 재확인 없이 확정)", () => {
  for (const v of [3.45 * 억, 3.794999 * 억, 3.795 * 억]) {
    const input = common({ assetManwon: v });
    assert.deepEqual(birthReliefAsks("JAEGAEBAL", input, 1), {}, `${v}만원은 물을 필요가 없다`);
    assert.equal(judge("JAEGAEBAL", input, 1), "PASS");
  }
  const over = common({ assetManwon: 3.795001 * 억 });
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", over, 1), {});
  assert.equal(judge("JAEGAEBAL", over, 1), "FAIL");
});

test("출산2 자산 경계 — 4.14억 이하 통과, 초과 탈락 (정확 입력)", () => {
  for (const v of [3.795 * 억, 4.139999 * 억, 4.14 * 억]) {
    assert.equal(judge("JAEGAEBAL", common({ assetManwon: v }), 2), "PASS", `${v}만원`);
  }
  assert.equal(judge("JAEGAEBAL", common({ assetManwon: 4.140001 * 억 }), 2), "FAIL");
});

test("출산1·2 자산 경계 — 구간 선택이면 걸치는 구간만 재확인으로 확정", () => {
  // 3.795억은 구간 경계가 아니라 3.45억~4.05억 구간에 걸친다 → 재확인 문항
  const input = byBracket(3.5 * 억);
  assert.equal(input.assetManwon, 4.05 * 억);
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", input, 1), { asset: 379_500_000 });
  assert.equal(judge("JAEGAEBAL", input, 1), "NEEDS_MORE");
  assert.equal(judge("JAEGAEBAL", input, 1, { asset: true }), "PASS");
  assert.equal(judge("JAEGAEBAL", input, 1, { asset: false }), "FAIL");
  // 같은 구간이라도 출산2 컷(4.14억)은 구간 상한(4.05억)보다 높아 물을 필요가 없다
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", input, 2), {});
  assert.equal(judge("JAEGAEBAL", input, 2), "PASS");
});

test("상한 미상 구간(4.05억 초과)은 통과시키지 않고 반드시 재확인한다", () => {
  const input = byBracket(4.1 * 억);
  assert.equal(input.assetManwon, Number.POSITIVE_INFINITY);
  assert.equal(judge("JAEGAEBAL", input, 0), "FAIL", "출산0은 완화가 없어 그대로 탈락");
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", input, 2), { asset: 414_000_000 });
  assert.equal(judge("JAEGAEBAL", input, 2), "NEEDS_MORE");
  assert.equal(judge("JAEGAEBAL", input, 2, { asset: true }), "PASS");
  assert.equal(judge("JAEGAEBAL", input, 2, { asset: false }), "FAIL");
});

// ─── 자동차 경계 ────────────────────────────────────────────────────────────

test("자동차 경계 — 4,542만원 이하는 전 출산 구간 통과, 초과는 완화 컷으로 재확인", () => {
  const under = common({ assetManwon: 3000, carBand: "UNDER_4542" });
  for (const n of [0, 1, 2] as BirthCount[]) {
    assert.deepEqual(birthReliefAsks("JAEGAEBAL", under, n), {}, `출산${n}`);
    assert.equal(judge("JAEGAEBAL", under, n), "PASS", `출산${n}`);
  }
  const over = common({ assetManwon: 3000, carBand: "OVER" });
  assert.equal(judge("JAEGAEBAL", over, 0), "FAIL", "출산0은 4,542만원 초과면 탈락");
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", over, 1), { car: 49_960_000 });
  assert.deepEqual(birthReliefAsks("JAEGAEBAL", over, 2), { car: 54_500_000 });
  assert.equal(judge("JAEGAEBAL", over, 1), "NEEDS_MORE");
  assert.equal(judge("JAEGAEBAL", over, 1, { car: true }), "PASS");
  assert.equal(judge("JAEGAEBAL", over, 1, { car: false }), "FAIL");
  assert.equal(judge("JAEGAEBAL", over, 2, { car: true }), "PASS");
  assert.equal(judge("JAEGAEBAL", over, 2, { car: false }), "FAIL");
});

// ─── 매입임대 일반 (같은 함수를 공유) ───────────────────────────────────────

test("매입일반 — 출산0/1/2 자산 컷(2.45 / 2.69 / 2.94억) 경계", () => {
  assert.equal(judge("MAEIP_ILBAN", common({ assetManwon: 2.45 * 억 }), 0), "PASS");
  assert.equal(judge("MAEIP_ILBAN", common({ assetManwon: 2.450001 * 억 }), 0), "FAIL");
  assert.equal(judge("MAEIP_ILBAN", common({ assetManwon: 2.69 * 억 }), 1), "PASS");
  assert.equal(judge("MAEIP_ILBAN", common({ assetManwon: 2.690001 * 억 }), 1), "FAIL");
  assert.equal(judge("MAEIP_ILBAN", common({ assetManwon: 2.94 * 억 }), 2), "PASS");
  assert.equal(judge("MAEIP_ILBAN", common({ assetManwon: 2.940001 * 억 }), 2), "FAIL");
});

test("매입일반 — 구간 선택이 컷에 걸치면 재확인 예/아니오/무응답", () => {
  const input = byBracket(2.6 * 억); // 2.51억~3.37억 구간 → 대표값 3.37억
  assert.equal(input.assetManwon, 3.37 * 억);
  assert.equal(judge("MAEIP_ILBAN", input, 0), "FAIL", "출산0은 완화 없이 대표값으로 판정");
  assert.deepEqual(birthReliefAsks("MAEIP_ILBAN", input, 1), { asset: 269_000_000 });
  assert.equal(judge("MAEIP_ILBAN", input, 1), "NEEDS_MORE");
  assert.equal(judge("MAEIP_ILBAN", input, 1, { asset: true }), "PASS");
  assert.equal(judge("MAEIP_ILBAN", input, 1, { asset: false }), "FAIL");
});

test("매입일반 — 구간 선택이 1-1 최댓값(2.94억)을 넘어도 1-2 재확인으로 확정한다", () => {
  // 회귀: 실제 2.60억(출산1이면 통과)인데 구간 대표값 3.37억 > 1-1 최댓값 2.94억 이라
  // 1-1에서 바로 탈락하던 버그. 구간 선택값은 상한 추정치라 1-1에서 자르면 안 된다.
  const input = byBracket(2.6 * 억);
  assert.ok(stage1Common(input).candidates.includes("MAEIP_ILBAN"));
  assert.equal(judge("MAEIP_ILBAN", input, 1, { asset: true }), "PASS");
  assert.equal(judge("MAEIP_ILBAN", input, 1, { asset: false }), "FAIL");
});

test("매입일반 — 금액을 직접 입력했으면 1-1에서 그대로 판정한다 (불필요한 재확인 없음)", () => {
  const input = common({ assetManwon: 3.37 * 억 }); // 정확 입력 3.37억 > 2.94억
  assert.ok(!stage1Common(input).candidates.includes("MAEIP_ILBAN"));
  assert.equal(judge("MAEIP_ILBAN", input, 2), "FAIL");
});

test("매입일반 — 자동차 완화 컷도 재개발과 같은 값으로 재확인", () => {
  const over = common({ assetManwon: 2000, carBand: "OVER" });
  assert.deepEqual(birthReliefAsks("MAEIP_ILBAN", over, 1), { car: 49_960_000 });
  assert.equal(judge("MAEIP_ILBAN", over, 2, { car: true }), "PASS");
  assert.equal(judge("MAEIP_ILBAN", over, 2, { car: false }), "FAIL");
});

// ─── 1-1 게이트 & 타 유형 회귀 ──────────────────────────────────────────────

test("1-1 — 상한 미상 구간은 출산완화 유형만 후보로 남기고 1-2로 미룬다", () => {
  const { candidates } = stage1Common(common({ assetManwon: 3000, carBand: "OVER" }));
  assert.deepEqual([...candidates].sort(), ["JAEGAEBAL", "MAEIP_ILBAN"]);
});

test("타 유형 회귀 — 통합·행복·매입청년은 완화 없이 기본 컷 그대로", () => {
  const tiers = { tiers: { attrs: ["일반" as const] } };
  // 3.45억 이하 + 자동차 4,542만원 이하 → 통과
  const ok = common({ assetManwon: 3.45 * 억, carBand: "UNDER_4542" });
  assert.equal(status(ok, "TONGHAP", tiers), "PASS");
  // 3.45억 초과 → 1-1에서 탈락 (출산완화 유형이 아니므로 미루지 않는다)
  const overAsset = common({ assetManwon: 3.450001 * 억 });
  assert.equal(status(overAsset, "TONGHAP", tiers), "FAIL");
  assert.equal(status(overAsset, "HAENGBOK", tiers), "FAIL");
  // 자동차 4,542만원 초과 → 통합·행복·매입청년은 1-1 탈락
  const overCar = common({ assetManwon: 3000, carBand: "OVER" });
  for (const t of ["TONGHAP", "HAENGBOK", "MAEIP_CHUNG"] as EligibilityTypeCode[]) {
    assert.equal(status(overCar, t, tiers), "FAIL", t);
  }
});

test("2026 기준연도 — 재개발임대도 2026 공고", () => {
  const r = evaluateAll(common({ assetManwon: 3000 }), { JAEGAEBAL: { children: 0 } });
  assert.equal(r.find((x) => x.type === "JAEGAEBAL")!.baseYear, 2026);
});
