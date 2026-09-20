/** 채팅 위치 기반 추천 자체 점검.
 *  실행: npm test  (node --test, 별도 테스트 프레임워크 없음) */
import assert from "node:assert/strict";
import { test } from "node:test";
import { haversineMeters } from "@/lib/coordinates";
import {
  extractLocationQuery,
  keepKnownIds,
  pickNearby,
  resolveLocationRequest,
  stripTravelTimeClaims,
  SEARCH_RADII_M,
} from "@/features/chat/location-recommend";
import type { HousingUnit } from "@/mocks/housing";

// ── 거리 계산 ────────────────────────────────────────────────────────────

/** 부산시청(연제구) ↔ 부산역(동구). 실제 직선거리는 대략 5.3km. */
const CITY_HALL = { lat: 35.1798, lng: 129.0750 };
const BUSAN_STATION = { lat: 35.1151, lng: 129.0423 };

test("같은 좌표는 0m", () => {
  assert.equal(Math.round(haversineMeters(CITY_HALL, CITY_HALL)), 0);
});

test("부산의 알려진 두 지점 거리가 합리적 범위", () => {
  const d = haversineMeters(CITY_HALL, BUSAN_STATION);
  assert.ok(d > 7000 && d < 8500, `예상 7~8.5km, 실제 ${Math.round(d)}m`);
});

test("lat/lng 를 뒤집으면 값이 크게 달라진다 (뒤바뀜 탐지)", () => {
  const ok = haversineMeters(CITY_HALL, BUSAN_STATION);
  const swapped = haversineMeters(
    { lat: CITY_HALL.lng, lng: CITY_HALL.lat },
    { lat: BUSAN_STATION.lng, lng: BUSAN_STATION.lat },
  );
  assert.ok(Math.abs(ok - swapped) > 1000, "뒤집어도 같은 값이면 검증이 무의미하다");
});

// ── 장소명 추출 ──────────────────────────────────────────────────────────

test("위치 요청에서 기준 장소명을 뽑는다", () => {
  assert.equal(extractLocationQuery("초읍 근처 주택 알려줘"), "초읍");
  assert.equal(extractLocationQuery("서면역 주변 공공임대 추천해 줘"), "서면역");
  assert.equal(extractLocationQuery("부산역에서 가까운 곳"), "부산역");
  assert.equal(extractLocationQuery("부산대학교 인근 주택"), "부산대학교");
  assert.equal(extractLocationQuery("직장 근처로 추천해 줘"), "직장");
  assert.equal(extractLocationQuery("학교에서 가까운 주택"), "학교");
});

test("위치 요청이 아니면 null (불필요한 Kakao 검색 방지)", () => {
  for (const message of [
    "행복주택과 통합공공임대 차이가 뭐예요?",
    "신청 서류 알려줘",
    "예산 월 30만원으로 추천해줘",
    "안녕하세요",
  ]) {
    assert.equal(extractLocationQuery(message), null, message);
  }
});

test("장소를 특정할 수 없으면 빈 문자열 (되묻기 신호)", () => {
  assert.equal(extractLocationQuery("여기 근처 주택 알려줘"), "");
  assert.equal(extractLocationQuery("이 근처 집 추천"), "");
  assert.equal(extractLocationQuery("가까운 주택 추천해줘"), "");
});

// ── 후보 선정 ────────────────────────────────────────────────────────────

const unit = (id: string, lat: number, lng: number, extra: Partial<HousingUnit> = {}) =>
  ({
    id,
    name: id,
    address: `주소 ${id}`,
    type: "MAEIP_ILBAN",
    gungu: "부산진구",
    coord: { lat, lng },
    conditions: [{ deposit: 1000, monthlyRent: 20 }],
    ...extra,
  }) as unknown as HousingUnit;

test("가까운 순으로 정렬되고 거리가 계산돼 붙는다", () => {
  // 셋 다 첫 반경(5km) 안에 두어 정렬만 본다.
  const third = unit("third", 35.2100, 129.1000);
  const near = unit("near", 35.1800, 129.0760);
  const mid = unit("mid", 35.1900, 129.0900);
  const out = pickNearby(CITY_HALL, [third, near, mid]);
  assert.deepEqual(out.candidates.map((c) => c.id), ["near", "mid", "third"]);
  assert.ok(out.candidates[0].distanceMeters < 200, "같은 동네면 수백 m 이내");
  assert.ok(out.candidates[0].distanceMeters < out.candidates[1].distanceMeters);
  assert.ok(out.candidates[1].distanceMeters < out.candidates[2].distanceMeters);
});

test("첫 반경 밖의 주택은 반경 안 후보가 있으면 제외된다", () => {
  const near = unit("near", 35.1800, 129.0760);
  const far = unit("far", 35.2500, 129.2000); // 약 14km
  const out = pickNearby(CITY_HALL, [near, far]);
  assert.equal(out.radiusMeters, 5000);
  assert.deepEqual(out.candidates.map((c) => c.id), ["near"]);
});

test("좌표가 없거나 범위를 벗어난 주택은 후보에서 빠진다 (좌표를 지어내지 않는다)", () => {
  const good = unit("good", 35.18, 129.076);
  const noCoord = { ...unit("nc", 0, 0), coord: undefined } as unknown as HousingUnit;
  const nan = unit("nan", Number.NaN, 129.0);
  const outOfRange = unit("oor", 91, 200);
  const out = pickNearby(CITY_HALL, [good, noCoord, nan, outOfRange]);
  assert.deepEqual(out.candidates.map((c) => c.id), ["good"]);
});

test("반경 단계는 추천 점수 계단(FREQUENT_STEPS)을 그대로 쓴다", () => {
  assert.deepEqual(SEARCH_RADII_M, [5000, 10000, 30000]);
});

test("첫 반경에 없으면 다음 반경으로 넓히고 widened 를 알린다", () => {
  const eightKm = unit("8km", 35.2520, 129.0750); // 시청에서 약 8km 북쪽
  const out = pickNearby(CITY_HALL, [eightKm]);
  assert.equal(out.widened, true);
  assert.equal(out.radiusMeters, 10000);
  assert.equal(out.outOfRange, false);
});

test("마지막 반경 밖이면 outOfRange 로 표시한다 ('근처'라고 하지 않게)", () => {
  const seoul = unit("seoul", 37.5563, 126.9723);
  const out = pickNearby(CITY_HALL, [seoul]);
  assert.equal(out.outOfRange, true);
  assert.equal(out.radiusMeters, null);
  assert.ok(out.candidates[0].distanceMeters > 300_000);
});

test("자격 유형과 예산으로 먼저 좁힌다", () => {
  const cheap = unit("cheap", 35.181, 129.076);
  const pricey = unit("pricey", 35.180, 129.075, {
    conditions: [{ deposit: 90_000, monthlyRent: 200 }],
  } as Partial<HousingUnit>);
  const otherType = unit("other", 35.1805, 129.0755, { type: "HAENGBOK" } as Partial<HousingUnit>);

  const byType = pickNearby(CITY_HALL, [cheap, pricey, otherType], { eligibleTypes: ["MAEIP_ILBAN"] });
  assert.equal(byType.candidates.some((c) => c.id === "other"), false);

  const byBudget = pickNearby(CITY_HALL, [cheap, pricey], {
    budget: { maxDeposit: 5000, maxMonthlyRent: 35 },
  });
  assert.deepEqual(byBudget.candidates.map((c) => c.id), ["cheap"]);
  assert.equal(byBudget.candidates[0].fitsBudget, true);
});

test("조건으로 후보가 0이 되면 조건을 풀고 그 사실을 알린다", () => {
  const pricey = unit("pricey", 35.181, 129.076, {
    conditions: [{ deposit: 90_000, monthlyRent: 200 }],
  } as Partial<HousingUnit>);
  const out = pickNearby(CITY_HALL, [pricey], {
    eligibleTypes: ["HAENGBOK"],
    budget: { maxDeposit: 5000, maxMonthlyRent: 35 },
  });
  assert.equal(out.relaxedType, true);
  assert.equal(out.relaxedBudget, true);
  assert.equal(out.candidates.length, 1);
  assert.equal(out.candidates[0].fitsBudget, false);
});

// ── 후보 밖 차단 ─────────────────────────────────────────────────────────

test("후보에 없는 id 는 버린다", () => {
  assert.deepEqual(keepKnownIds(["a", "zzz", "b"], ["a", "b"]), ["a", "b"]);
  assert.deepEqual(keepKnownIds(["zzz"], ["a"]), []);
  assert.deepEqual(keepKnownIds([], ["a"]), []);
});

// ── 해석 흐름 ────────────────────────────────────────────────────────────

const units = [unit("near", 35.1800, 129.0760), unit("far", 35.2600, 129.2100)];
const okSearch = (lat: number, lng: number, name = "초읍동") =>
  (async () => ({
    status: "ok" as const,
    places: [
      {
        id: "1",
        place_name: name,
        address_name: "부산 부산진구 초읍동",
        road_address_name: "부산 부산진구 새싹로 295",
        category_name: "",
        category_group_name: "",
        phone: "",
        x: String(lng),
        y: String(lat),
      },
    ],
  }));

test("위치 요청이 아니면 Kakao 검색을 호출하지 않는다", async () => {
  let called = 0;
  const out = await resolveLocationRequest("신청 서류 알려줘", { units }, {
    search: (async () => { called += 1; return { status: "empty" as const }; }),
  });
  assert.deepEqual(out, { kind: "none" });
  assert.equal(called, 0);
});

test("정상 요청이면 기준 좌표와 후보를 돌려준다", async () => {
  const out = await resolveLocationRequest("초읍 근처 주택 알려줘", { units }, {
    search: okSearch(35.1798, 129.0750),
  });
  assert.equal(out.kind, "ok");
  if (out.kind !== "ok") return;
  assert.equal(out.payload.anchor.name, "초읍동");
  assert.equal(out.payload.anchor.address, "부산 부산진구 새싹로 295");
  assert.equal(out.payload.anchor.source, "kakao");
  assert.equal(out.payload.candidates[0].id, "near");
  assert.ok(out.payload.candidates[0].distanceMeters >= 0);
});

test("저장한 '자주 가는 장소' 별칭이면 검색 없이 그 좌표를 쓴다", async () => {
  let called = 0;
  const out = await resolveLocationRequest(
    "직장 근처 주택 추천해줘",
    {
      units,
      frequent: [{ id: "f1", label: "직장", address: "부산 서구 구덕로 179", coord: { lat: 35.1008, lng: 129.0187 } }],
    },
    { search: (async () => { called += 1; return { status: "empty" as const }; }) },
  );
  assert.equal(out.kind, "ok");
  if (out.kind !== "ok") return;
  assert.equal(called, 0, "별칭이 맞으면 Kakao 를 부르지 않아야 한다");
  assert.equal(out.payload.anchor.source, "saved");
  assert.deepEqual(out.payload.anchor.coord, { lat: 35.1008, lng: 129.0187 });
});

test("검색 실패·결과없음·SDK 실패를 서로 다른 안내로 구분한다", async () => {
  const ask = async (status: "empty" | "error" | "sdk-error") => {
    const out = await resolveLocationRequest("없는동네 근처 주택", { units }, {
      search: (async () => ({ status })) as never,
    });
    assert.equal(out.kind, "ask");
    return out.kind === "ask" ? out.message : "";
  };
  const empty = await ask("empty");
  const error = await ask("error");
  const sdk = await ask("sdk-error");
  assert.match(empty, /찾지 못했어요/);
  assert.match(error, /문제가 발생했어요/);
  assert.match(sdk, /지도 서비스/);
  assert.notEqual(empty, error, "결과 없음과 네트워크 오류는 같은 메시지가 아니어야 한다");
});

test("장소를 특정 못하면 되묻고 검색하지 않는다", async () => {
  let called = 0;
  const out = await resolveLocationRequest("여기 근처 주택 알려줘", { units }, {
    search: (async () => { called += 1; return { status: "empty" as const }; }),
  });
  assert.equal(out.kind, "ask");
  assert.equal(called, 0);
  if (out.kind === "ask") assert.match(out.message, /어느 장소를 기준으로/);
});

test("좌표가 유효한 주택이 하나도 없으면 솔직히 안내한다", async () => {
  const broken = [{ ...unit("x", 0, 0), coord: undefined } as unknown as HousingUnit];
  const out = await resolveLocationRequest("초읍 근처 주택", { units: broken }, {
    search: okSearch(35.1798, 129.0750),
  });
  assert.equal(out.kind, "ask");
  if (out.kind === "ask") assert.match(out.message, /좌표 정보가 부족/);
});

// ── 소요시간 표현 차단 ───────────────────────────────────────────────────

test("괄호로 덧붙인 이동시간 주장을 지운다 (범위 표기 포함)", () => {
  const out = stripTravelTimeClaims(
    "거리: 186m (도보 2~3분)\n둘째: 1.1km (차로 5분)\n셋째: 731m (도보 약 10분 내외)",
  );
  assert.equal(/도보|차로/.test(out), false);
  assert.ok(out.includes("186m") && out.includes("1.1km") && out.includes("731m"), "거리 수치는 남아야 한다");
});

test("문장을 망가뜨리지 않는다 (괄호 밖은 건드리지 않음)", () => {
  const inline = "서면역에서 도보 10분으로 이동 가능한 거리예요.";
  assert.equal(stripTravelTimeClaims(inline), inline);
});

test("소요시간 표현이 없으면 원문을 건드리지 않는다", () => {
  const text = "기준 장소: 부산어린이대공원\n- 소망빌라A · 약 1.0km";
  assert.equal(stripTravelTimeClaims(text), text);
});
