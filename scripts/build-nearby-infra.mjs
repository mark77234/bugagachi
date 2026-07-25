/**
 * 주택 건물별 "주변 인프라" 사전계산.
 *
 * 원본 인프라 데이터는 전체 16만 건(60MB)이라 클라이언트로 보낼 수 없다.
 * 인프라는 지도에서 마커를 선택했을 때와 상세 페이지에서만 쓰이고 주택 건물은 38개뿐이므로,
 * 빌드 시점에 건물별 근접 POI만 추려 `data/nearby_infra.json`으로 굽는다.
 *
 *   1순위(required)   : 종합병원·대형마트·공원·공공도서관·생활체육시설·지하철역 (6종)
 *   2순위(preference) : 2단계 취향 가게 칩과 1:1 대응하는 10종
 *   교육(education)   : 어린이집·유치원·초·중·고 (설문에서 자녀가 있을 때만 노출)
 *
 * 실행: node scripts/build-nearby-infra.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toEpsg5186, planarMeters, sourceTmToLatLng } from "./lib/tm5186.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

/** 부산 우회계수 — src/lib/coordinates.ts 와 동일 기준. */
const DETOUR = 1.291;

/** 티어별 기본 수집 반경(보정거리 m)과 건물당 카테고리별 최대 개수.
 *  지도·상세에서 "가까운 순으로 최대한 많이" 보여줄 수 있도록 넉넉히 담는다. */
const LIMITS = {
  required: { radius: 5000, perCategory: 6 },
  preference: { radius: 1500, perCategory: 10 },
  education: { radius: 4000, perCategory: 6 },
};

/**
 * 카테고리별 반경 예외.
 * 종합병원·공공도서관은 추천 점수에서도 차량 기준(5~20km)으로 다루고,
 * 원본 파일이 시립도서관 14곳·종합병원 31곳뿐이라 3km 안에 한 곳도 없는 건물이 많다.
 * 이름을 보여주려면 반경을 넓혀야 한다.
 */
const CATEGORY_RADIUS = {
  HOSPITAL: 12000,
  LIBRARY: 12000,
};

const readJson = (path) => JSON.parse(readFileSync(join(DATA, path), "utf8"));
const num = (value) => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** 위경도 컬럼을 그대로 가진 소스(1순위·교육). */
function fromLatLngRows(rows, { name, detail, filter }) {
  const out = [];
  for (const row of rows) {
    if (filter && !filter(row)) continue;
    const lat = num(row["위도"]);
    const lng = num(row["경도"]);
    if (lat === null || lng === null) continue;
    const label = (typeof name === "function" ? name(row) : row[name])?.toString().trim();
    if (!label) continue;
    out.push({ name: label, detail: detail ? detail(row) : undefined, lat, lng });
  }
  return out;
}

/** 중부원점 평면좌표를 가진 소스(2순위 상가). */
function fromTmRows(rows) {
  const out = [];
  for (const row of rows) {
    const x = num(row.lon);
    const y = num(row.lat);
    if (x === null || y === null) continue;
    const label = row.CM_NM?.toString().trim();
    if (!label) continue;
    const { lat, lng } = sourceTmToLatLng(x, y);
    out.push({ name: label, detail: row.SIC_NM?.toString().trim() || undefined, lat, lng });
  }
  return out;
}

console.log("인프라 원본 로딩 중…");

/** 1순위 — 필수 인프라 6종. key 는 src 의 InfraCategory 와 동일. */
const REQUIRED = {
  HOSPITAL: fromLatLngRows(readJson("required_infra/hospital.json"), {
    name: "사업장명",
    detail: (r) => r["의료기관종별명"] ?? undefined,
  }),
  MART: fromLatLngRows(readJson("required_infra/mart.json"), {
    name: "사업장명",
    detail: (r) => r["업태구분"] ?? undefined,
    filter: (r) => r["영업상태명"] !== "폐업",
  }),
  PARK: fromLatLngRows(readJson("required_infra/park.json"), {
    name: "공원명",
    detail: (r) => r["공원종류"] ?? undefined,
  }),
  LIBRARY: fromLatLngRows(readJson("required_infra/library.json"), {
    name: "시설명",
    detail: (r) => r["시설구분"] ?? undefined,
  }),
  SPORTS: fromLatLngRows(readJson("required_infra/sports_facility.json"), {
    name: "시설명",
    detail: (r) => r["재분류유형"] ?? undefined,
  }),
  SUBWAY: fromLatLngRows(readJson("required_infra/train_station.json"), {
    name: (r) => `${r["역명"]}역`,
    detail: (r) => r["선명"] ?? undefined,
  }),
};

/** 2순위 — 취향 가게 10종. key 는 2단계 Q5 칩 라벨과 1:1. */
const PREFERENCE_FILES = {
  식당: "restaurant.json",
  뷰티: "beauty.json",
  카페: "cafe.json",
  "편의점/슈퍼마켓": "convenient_store_and_market.json",
  "운동/스포츠": "sports.json",
  베이커리: "bakery.json",
  치킨: "chicken.json",
  주점: "pub.json",
  "입시/예체능 학원": "arts_physical_academy.json",
  "독서실/스터디카페": "study_cafe.json",
};

const PREFERENCE = {};
for (const [chip, file] of Object.entries(PREFERENCE_FILES)) {
  PREFERENCE[chip] = fromTmRows(readJson(join("preferences_infra", file)));
}

/** 교육 — 어린이집 + 학교(유치원/초/중/고). key 는 src 의 EduCategory 와 동일. */
const schools = readJson("education_infra/schools.json");
const schoolsOf = (type) =>
  fromLatLngRows(schools, { name: "위치(기관)명", filter: (r) => r["기관유형"] === type });

const EDUCATION = {
  DAYCARE: fromLatLngRows(readJson("education_infra/daycare_center.json"), {
    name: "어린이집명",
    detail: (r) => r["어린이집유형구분"] ?? undefined,
  }),
  KINDER: schoolsOf("유치원"),
  ELEM: schoolsOf("초등학교"),
  MIDDLE: schoolsOf("중학교"),
  HIGH: schoolsOf("고등학교"),
};

const countOf = (group) =>
  Object.entries(group).map(([k, v]) => `${k}:${v.length}`).join(" ");
console.log("  required  ", countOf(REQUIRED));
console.log("  preference", countOf(PREFERENCE));
console.log("  education ", countOf(EDUCATION));

// POI 를 평면좌표로 한 번만 투영해 둔다(건물 38개 × 16만 건 반복 투영 방지).
function projectAll(group) {
  const out = {};
  for (const [key, list] of Object.entries(group)) {
    out[key] = list.map((poi) => ({ ...poi, ...toEpsg5186({ lat: poi.lat, lng: poi.lng }) }));
  }
  return out;
}
const PROJECTED = {
  required: projectAll(REQUIRED),
  preference: projectAll(PREFERENCE),
  education: projectAll(EDUCATION),
};

/** src/mocks/housing.ts 의 stableId 와 동일한 해시(FNV-1a). 건물 id 를 그대로 키로 쓴다. */
function stableId(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `rental-${(hash >>> 0).toString(36)}`;
}

const rentalRows = readJson("busan_rental_scores.json").filter(
  (row) =>
    row.address_norm && row.address && row.district && typeof row.lat === "number" && typeof row.lon === "number",
);
const buildings = new Map();
for (const row of rentalRows) {
  if (!buildings.has(row.address_norm)) {
    buildings.set(row.address_norm, { lat: row.lat, lng: row.lon });
  }
}
console.log(`주택 건물 ${buildings.size}곳 기준 근접 인프라 계산 중…`);

/** 한 건물 기준으로 카테고리별 최근접 POI 를 뽑는다. 거리는 보정거리(m). */
function nearestFor(origin, projectedGroup, { radius, perCategory }) {
  const result = [];
  for (const [category, list] of Object.entries(projectedGroup)) {
    const limit = CATEGORY_RADIUS[category] ?? radius;
    const hits = [];
    for (const poi of list) {
      const distance = planarMeters(origin, poi) * DETOUR;
      if (distance > limit) continue;
      hits.push({ category, name: poi.name, detail: poi.detail, lat: poi.lat, lng: poi.lng, distance });
    }
    hits.sort((a, b) => a.distance - b.distance);
    result.push(...hits.slice(0, perCategory));
  }
  return result.sort((a, b) => a.distance - b.distance).map((hit) => ({
    c: hit.category,
    n: hit.name,
    ...(hit.detail ? { s: hit.detail } : {}),
    lat: Number(hit.lat.toFixed(6)),
    lng: Number(hit.lng.toFixed(6)),
    d: Math.round(hit.distance),
  }));
}

const output = {};
for (const [addressNorm, coord] of buildings) {
  const origin = toEpsg5186(coord);
  output[stableId(addressNorm)] = {
    required: nearestFor(origin, PROJECTED.required, LIMITS.required),
    preference: nearestFor(origin, PROJECTED.preference, LIMITS.preference),
    education: nearestFor(origin, PROJECTED.education, LIMITS.education),
  };
}

const payload = {
  generatedFrom: "data/required_infra, data/preferences_infra, data/education_infra",
  detourFactor: DETOUR,
  limits: LIMITS,
  categoryRadius: CATEGORY_RADIUS,
  buildings: output,
};

const target = join(DATA, "nearby_infra.json");
writeFileSync(target, JSON.stringify(payload));

const totals = Object.values(output).reduce(
  (acc, b) => ({
    required: acc.required + b.required.length,
    preference: acc.preference + b.preference.length,
    education: acc.education + b.education.length,
  }),
  { required: 0, preference: 0, education: 0 },
);
const sizeKb = (readdirSync(DATA), (readFileSync(target).length / 1024).toFixed(0));
console.log(
  `완료 → data/nearby_infra.json (${sizeKb}KB) · 건물 ${Object.keys(output).length}곳 · ` +
    `필수 ${totals.required} · 취향 ${totals.preference} · 교육 ${totals.education}`,
);
