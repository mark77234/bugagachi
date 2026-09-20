/** Kakao 장소 검색 변환·검색 정책 자체 점검.
 *  실행: npm test  (node --test, 별도 테스트 프레임워크 없음) */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  searchPlaces,
  shouldSearchKeyword,
  toFrequentDestination,
  type KakaoPlace,
  type KakaoSearchStatus,
  type PlaceSearchApi,
} from "./kakao-sdk.ts";

const PLACE: KakaoPlace = {
  id: "8138157",
  place_name: "부산대학교",
  address_name: "부산 금정구 장전동 30",
  road_address_name: "부산 금정구 부산대학로63번길 2",
  category_name: "교육,학문 > 학교 > 대학교",
  category_group_name: "학교",
  phone: "051-510-0114",
  x: "129.0844", // 경도
  y: "35.2314", // 위도
};

// ── 변환 로직 ────────────────────────────────────────────────────────────

test("x 는 경도(lng), y 는 위도(lat) 로 변환한다", () => {
  const d = toFrequentDestination(PLACE, "")!;
  assert.deepEqual(d.coord, { lat: 35.2314, lng: 129.0844 });
  // 뒤바뀌었다면 부산 위도 범위를 벗어난다.
  assert.ok(d.coord.lat > 34 && d.coord.lat < 36, "위도가 부산 범위 밖");
  assert.ok(d.coord.lng > 128 && d.coord.lng < 130, "경도가 부산 범위 밖");
});

test("도로명주소를 우선 쓰고, 없으면 지번주소를 쓴다", () => {
  assert.equal(toFrequentDestination(PLACE, "")!.address, PLACE.road_address_name);
  assert.equal(
    toFrequentDestination({ ...PLACE, road_address_name: "" }, "")!.address,
    PLACE.address_name,
  );
});

test("별칭이 있으면 별칭을, 없으면 장소명을 label 로 쓴다", () => {
  assert.equal(toFrequentDestination(PLACE, "  학교 ")!.label, "학교");
  assert.equal(toFrequentDestination(PLACE, "   ")!.label, "부산대학교");
});

test("id 는 Kakao 장소 ID 를 그대로 쓴다", () => {
  assert.equal(toFrequentDestination(PLACE, "")!.id, "8138157");
});

test("숫자가 아니거나 범위를 벗어난 좌표는 거부한다 (임의 좌표로 보정하지 않는다)", () => {
  for (const bad of [
    { x: "", y: "" },
    { x: "abc", y: "35.2" },
    { x: "129.0", y: "NaN" },
    { x: "129.0", y: "91" }, // 위도 > 90
    { x: "129.0", y: "-90.5" },
    { x: "181", y: "35.2" }, // 경도 > 180
    { x: "-180.5", y: "35.2" },
  ]) {
    assert.equal(toFrequentDestination({ ...PLACE, ...bad }, ""), null, JSON.stringify(bad));
  }
});

// ── 검색어 판정 ──────────────────────────────────────────────────────────

test("한 글자는 검색하지 않고 두 글자부터 검색한다", () => {
  assert.equal(shouldSearchKeyword(""), false);
  assert.equal(shouldSearchKeyword("부"), false);
  assert.equal(shouldSearchKeyword("부산"), true);
  assert.equal(shouldSearchKeyword("부산대학교"), true);
});

test("조합 중인 한글 낱자로 끝나면 검색하지 않는다", () => {
  assert.equal(shouldSearchKeyword("부사ㄴ"), false); // 조합 중
  assert.equal(shouldSearchKeyword("부산ㄷ"), false);
  assert.equal(shouldSearchKeyword("부산대"), true); // 완성됨
});

// ── 검색 정책 (부산 우선 → 전국 폴백) ────────────────────────────────────

function stubApi(
  responses: { status: KakaoSearchStatus; places?: KakaoPlace[] }[],
  calls: { radius?: number }[] = [],
): PlaceSearchApi {
  let i = 0;
  return {
    places: {
      keywordSearch(_keyword, callback, options) {
        calls.push({ radius: options?.radius });
        const r = responses[i++] ?? { status: "ZERO_RESULT" as const };
        setTimeout(() => callback(r.places ?? null, r.status), 0);
      },
    },
    status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" },
    sortByAccuracy: "ACCURACY",
    latLng: () => ({}),
  };
}

test("부산 반경 안에서 결과가 나오면 전국 검색을 하지 않는다", async () => {
  const calls: { radius?: number }[] = [];
  const out = await searchPlaces("부산대학교", async () => stubApi([{ status: "OK", places: [PLACE] }], calls));
  assert.deepEqual(out, { status: "ok", places: [PLACE] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].radius, 20000, "부산 반경은 최대값(20km)이어야 부산 전역을 덮는다");
});

test("부산에 없으면 전국으로 한 번 더 찾는다 (부산 외 장소를 막지 않는다)", async () => {
  const calls: { radius?: number }[] = [];
  const out = await searchPlaces(
    "서울역",
    async () => stubApi([{ status: "ZERO_RESULT" }, { status: "OK", places: [PLACE] }], calls),
  );
  assert.equal(out.status, "ok");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].radius, undefined, "전국 재검색에는 반경 필터가 없어야 한다");
});

test("양쪽 다 결과가 없으면 empty", async () => {
  const out = await searchPlaces("ㅁㄴㅇㄹ", async () =>
    stubApi([{ status: "ZERO_RESULT" }, { status: "ZERO_RESULT" }]),
  );
  assert.deepEqual(out, { status: "empty" });
});

test("Status.ERROR 는 error 로 구분한다", async () => {
  assert.deepEqual(await searchPlaces("부산역", async () => stubApi([{ status: "ERROR" }])), {
    status: "error",
  });
  assert.deepEqual(
    await searchPlaces("부산역", async () => stubApi([{ status: "ZERO_RESULT" }, { status: "ERROR" }])),
    { status: "error" },
  );
});

test("SDK 로드 실패는 sdk-error 로 구분한다", async () => {
  const out = await searchPlaces("부산역", async () => {
    throw new Error("sdk error");
  });
  assert.deepEqual(out, { status: "sdk-error" });
});

test("오래된 검색이 먼저 끝나도 최신 검색 결과를 덮어쓰지 않는다", async () => {
  // 컴포넌트와 같은 요청 번호 방식.
  let latest = 0;
  let shown = "";
  const dispatch = async (keyword: string, delay: number) => {
    const id = ++latest;
    await new Promise((r) => setTimeout(r, delay));
    if (id !== latest) return; // 오래된 응답은 버린다
    shown = keyword;
  };
  await Promise.all([dispatch("부산", 30), dispatch("부산대학교", 5)]);
  assert.equal(shown, "부산대학교");
});
