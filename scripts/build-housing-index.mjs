/**
 * 실데이터 마스터 4종 → 앱이 쓰는 주택 인덱스 생성.
 *
 * 원본은 84,002 호실행(128MB)이지만 통합공공임대가 "소득구간 × 가구인원수 × 주택형" 조합마다
 * 한 행씩 들어 있어 대부분이 가격표 중복이다. 이를 두 축으로 정규화하면 크게 줄어든다.
 *
 *   건물(355) → 물리 호실(9,022) + 가격행(930)
 *
 * 동시에 docs/score_logic.md 의 Q3~Q6 점수를 전부 여기서 계산한다.
 * (런타임 거리·백분위 재계산 금지 — 사용자 입력에 의존하는 건 Q2 앵커와 Q6 의 t 뿐)
 *
 * 실행: node --max-old-space-size=8192 scripts/build-housing-index.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toEpsg5186, planarMeters, sourceTmToLatLng } from "./lib/tm5186.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const readJson = (path) => JSON.parse(readFileSync(join(DATA, path), "utf8"));

/** 부산 실측 우회계수 (김태곤 외 2013). 모든 거리축에 적용. */
const DETOUR = 1.291;
/** Q5·Q6 상가 집계 반경(m). 보정 전 직선거리 기준. */
const STORE_RADIUS = 750;

const num = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const text = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

/** 매듭 + 선형보간. 최상·최하 구간은 평탄(포화). 계단함수 금지. */
function knotScore(distance, knots, values) {
  if (distance <= knots[0]) return values[0];
  for (let i = 0; i < knots.length - 1; i += 1) {
    if (distance <= knots[i + 1]) {
      const t = (distance - knots[i]) / (knots[i + 1] - knots[i]);
      return values[i] + t * (values[i + 1] - values[i]);
    }
  }
  return values[values.length - 1];
}

const KNOT_VALUES = [1.0, 0.6, 0.2, 0.0];
const WALK_KNOTS = [750, 1500, 3000, 6000];
const VEHICLE_KNOTS = [5000, 10000, 15000, 20000];
const DAYCARE_KNOTS = [375, 750, 1500, 3000];

/** 값 배열 → 백분위(평균 순위, 0~1). 동점은 평균 순위. */
function percentileRank(values) {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);
  const out = new Array(values.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) j += 1;
    // 동점 구간 [i, j] 의 평균 순위(1-based) → 백분위
    const averageRank = (i + j) / 2 + 1;
    const pct = averageRank / indexed.length;
    for (let k = i; k <= j; k += 1) out[indexed[k].index] = pct;
    i = j + 1;
  }
  return out;
}

// ── 1. 주택 마스터 로드 ────────────────────────────────────────────────
const MASTER_FILES = [
  "real_house_data/master_purchased_rental.json",
  "real_house_data/master_redevelopment_rental.json",
  "real_house_data/master_integrated_public_rental.json",
  "real_house_data/master_happy_housing.json",
];

/** 원본 유형코드 → 앱의 EligibilityTypeCode. 매입임대는 자격요약이 '무주택 일반'뿐이라 일반으로 매핑. */
const TYPE_CODE = {
  MAEIP: "MAEIP_ILBAN",
  JAEGAEBAL: "JAEGAEBAL",
  TONGHAP: "TONGHAP",
  HAENGBOK: "HAENGBOK",
};

console.log("주택 마스터 로딩 중…");
let rows = [];
for (const file of MASTER_FILES) {
  const part = readJson(file);
  rows = rows.concat(part);
  console.log(`  ${file.split("/").pop()} ${part.length}행`);
}

const validRows = rows.filter(
  (row) =>
    text(row["도로명주소_정제"]) &&
    text(row["시군구"]) &&
    typeof row["위도"] === "number" &&
    typeof row["경도"] === "number" &&
    TYPE_CODE[row["유형코드"]],
);
console.log(`전체 ${rows.length}행 · 유효 ${validRows.length}행`);

/** src/mocks/housing.ts 와 동일한 해시(FNV-1a). 건물 id. */
function stableId(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `rental-${(hash >>> 0).toString(36)}`;
}

// ── 2. 건물 단위로 접기 ────────────────────────────────────────────────
const buildingMap = new Map();
for (const row of validRows) {
  const key = `${row["유형코드"]}|${text(row["도로명주소_정제"])}`;
  let building = buildingMap.get(key);
  if (!building) {
    building = {
      key,
      address: text(row["도로명주소_정제"]),
      typeCode: TYPE_CODE[row["유형코드"]],
      rentalTypeLabel: text(row["임대유형"]),
      gungu: text(row["시군구"]),
      lat: row["위도"],
      lng: row["경도"],
      complexName: text(row["단지명_표시"]) ?? text(row["단지명"]),
      houseType: text(row["주택유형"]),
      completionYear: text(row["준공연도"]),
      ageLabel: text(row["연식"]),
      elevator: text(row["승강기설치"]),
      parkingCount: num(row["주차대수"]),
      householdCount: num(row["세대수"]),
      buildingForm: text(row["건물형태"]),
      heating: text(row["난방방식"]),
      noticeUrl: text(row["공고원문링크"]),
      applyPortal: text(row["신청포털"]),
      dataSource: text(row["데이터출처"]),
      updatedAt: text(row["최종갱신일"]),
      priceDates: new Set(),
      eligibilitySummaries: new Set(),
      supplyClasses: new Set(),
      unitMap: new Map(),
      priceMap: new Map(),
      rowCount: 0,
    };
    buildingMap.set(key, building);
  }

  building.rowCount += 1;
  if (text(row["가격등록일"])) building.priceDates.add(text(row["가격등록일"]));
  if (text(row["자격조건요약"])) building.eligibilitySummaries.add(text(row["자격조건요약"]));
  if (text(row["공급계층명"])) building.supplyClasses.add(text(row["공급계층명"]));

  // 물리 호실 — 같은 호실이 가격 조합마다 반복되므로 중복 제거
  const unitKey = [row["동"], row["호명"], row["주택형"], row["전용면적_㎡"], row["방수"]].join("|");
  if (!building.unitMap.has(unitKey)) {
    building.unitMap.set(unitKey, {
      dong: text(row["동"]),
      unitNo: text(row["호명"]),
      unitType: text(row["주택형"]),
      areaM2: num(row["전용면적_㎡"]),
      areaPyeong: num(row["전용면적_평"]),
      commonAreaM2: num(row["공용면적"]),
      roomCount: num(row["방수"]),
      roomLayout: text(row["방구조"]),
    });
  }

  // 가격행 — 통합공공임대는 소득구간 × 가구인원수마다 가격이 다르다
  const deposit = num(row["보증금"]);
  const rent = num(row["임대료"]);
  if (deposit !== null && rent !== null) {
    const priceKey = [
      row["주택형"], row["소득구간"], row["가구인원수"], row["순위"],
      row["공급계층명"], row["보호구분명"], deposit, rent,
    ].join("|");
    if (!building.priceMap.has(priceKey)) {
      building.priceMap.set(priceKey, {
        unitType: text(row["주택형"]),
        incomeBracket: text(row["소득구간"]),
        householdSize: text(row["가구인원수"]),
        priorityRank: num(row["순위"]),
        supplyClass: text(row["공급계층명"]),
        protectionType: text(row["보호구분명"]),
        depositManwon: Math.round(deposit / 10000),
        rentManwon: Math.round(rent / 10000),
        areaM2: num(row["전용면적_㎡"]),
        roomCount: num(row["방수"]),
      });
    }
  }
}

const buildings = [...buildingMap.values()];
console.log(`건물 ${buildings.length}곳 · 물리 호실 ${buildings.reduce((s, b) => s + b.unitMap.size, 0)} · 가격행 ${buildings.reduce((s, b) => s + b.priceMap.size, 0)}`);

// ── 3. 인프라 원본 로드 ────────────────────────────────────────────────
console.log("인프라 원본 로딩 중…");

function latLngPoints(rows_, { latKey = "위도", lngKey = "경도", filter, extra } = {}) {
  const out = [];
  for (const row of rows_) {
    if (filter && !filter(row)) continue;
    const lat = num(row[latKey]);
    const lng = num(row[lngKey]);
    if (lat === null || lng === null) continue;
    out.push({ ...toEpsg5186({ lat, lng }), ...(extra ? extra(row) : {}) });
  }
  return out;
}

const REQUIRED_POINTS = {
  HOSPITAL: latLngPoints(readJson("required_infra/hospital.json")),
  MART: latLngPoints(readJson("required_infra/mart.json"), { filter: (r) => r["영업상태명"] !== "폐업" }),
  LIBRARY: latLngPoints(readJson("required_infra/library.json")),
  SPORTS: latLngPoints(readJson("required_infra/sports_facility.json")),
  SUBWAY: latLngPoints(readJson("required_infra/train_station.json")),
};
// 공원은 원주거리 특례를 위해 등가반경을 함께 싣는다.
const PARK_POINTS = latLngPoints(readJson("required_infra/park.json"), {
  extra: (r) => {
    const area = num(r["공원면적(m)"]);
    return { radius: area && area > 0 ? Math.sqrt(area / Math.PI) : 0 };
  },
});

const schools = readJson("education_infra/schools.json");
const EDUCATION_POINTS = {
  DAYCARE: latLngPoints(readJson("education_infra/daycare_center.json")),
  KINDER: latLngPoints(schools, { filter: (r) => r["기관유형"] === "유치원" }),
  ELEM: latLngPoints(schools, { filter: (r) => r["기관유형"] === "초등학교" }),
  MIDDLE: latLngPoints(schools, { filter: (r) => r["기관유형"] === "중학교" }),
  HIGH: latLngPoints(schools, { filter: (r) => r["기관유형"] === "고등학교" }),
};

/** 2단계 Q5 칩 10종 ↔ 원본 파일. */
const CHIP_FILES = {
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
const CHIPS = Object.keys(CHIP_FILES);

/** 상가는 좌표가 중부원점 평면(EPSG:5181 계열)이라 위경도가 아니다. 5186 으로 맞춘다. */
function storePoints(rows_) {
  const out = [];
  for (const row of rows_) {
    const x = num(row.lon);
    const y = num(row.lat);
    if (x === null || y === null) continue;
    const { lat, lng } = sourceTmToLatLng(x, y);
    out.push({ ...toEpsg5186({ lat, lng }), chip: row.CHIP || null, loud: row.LOUD === 1 });
  }
  return out;
}

let stores = [];
for (const [chip, file] of Object.entries(CHIP_FILES)) {
  const points = storePoints(readJson(join("preferences_infra", file)));
  points.forEach((p) => (p.chip = chip));
  stores = stores.concat(points);
}
// 분위기(Q6)의 store_total 은 "칩 매핑 무관 전 업종"이라 기타까지 포함한다.
stores = stores.concat(storePoints(readJson("preferences_infra/etc.json")));
console.log(`  상가 ${stores.length}건 (칩 10종 + 기타)`);

// ── 4. 공간 인덱스 (상가 750m 조회용 격자) ──────────────────────────────
const CELL = STORE_RADIUS;
const storeGrid = new Map();
for (const store of stores) {
  const key = `${Math.floor(store.easting / CELL)}:${Math.floor(store.northing / CELL)}`;
  const bucket = storeGrid.get(key);
  if (bucket) bucket.push(store);
  else storeGrid.set(key, [store]);
}

function storesNear(origin) {
  const cx = Math.floor(origin.easting / CELL);
  const cy = Math.floor(origin.northing / CELL);
  const hits = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const bucket = storeGrid.get(`${cx + dx}:${cy + dy}`);
      if (!bucket) continue;
      for (const store of bucket) {
        if (planarMeters(origin, store) <= STORE_RADIUS) hits.push(store);
      }
    }
  }
  return hits;
}

function nearestMeters(origin, points) {
  let min = Infinity;
  for (const point of points) {
    const d = planarMeters(origin, point);
    if (d < min) min = d;
  }
  return min;
}

/** 공원은 등가원 원주까지의 거리. 최근접이 중심점 기준과 달라지므로 전 공원을 훑는다. */
function nearestParkEdge(origin) {
  let min = Infinity;
  for (const park of PARK_POINTS) {
    const d = Math.max(planarMeters(origin, park) - park.radius, 0);
    if (d < min) min = d;
  }
  return min;
}

// ── 5. 건물별 점수 계산 ────────────────────────────────────────────────
console.log(`건물 ${buildings.length}곳 점수 계산 중…`);
const chipCounts = Object.fromEntries(CHIPS.map((chip) => [chip, []]));
const storeTotals = [];
const noiseRatios = [];

for (const building of buildings) {
  const origin = toEpsg5186({ lat: building.lat, lng: building.lng });
  building.origin = origin;

  building.infra = {};
  for (const [category, points] of Object.entries(REQUIRED_POINTS)) {
    const distance = nearestMeters(origin, points) * DETOUR;
    const knots = category === "HOSPITAL" || category === "LIBRARY" ? VEHICLE_KNOTS : WALK_KNOTS;
    building.infra[category] = {
      distance: Number.isFinite(distance) ? Math.round(distance) : null,
      score: Number.isFinite(distance) ? Number(knotScore(distance, knots, KNOT_VALUES).toFixed(4)) : null,
    };
  }
  const parkDistance = nearestParkEdge(origin) * DETOUR;
  building.infra.PARK = {
    distance: Number.isFinite(parkDistance) ? Math.round(parkDistance) : null,
    score: Number.isFinite(parkDistance) ? Number(knotScore(parkDistance, WALK_KNOTS, KNOT_VALUES).toFixed(4)) : null,
  };

  building.education = {};
  for (const [category, points] of Object.entries(EDUCATION_POINTS)) {
    const distance = nearestMeters(origin, points) * DETOUR;
    const knots = category === "DAYCARE" ? DAYCARE_KNOTS : WALK_KNOTS;
    building.education[category] = {
      distance: Number.isFinite(distance) ? Math.round(distance) : null,
      score: Number.isFinite(distance) ? Number(knotScore(distance, knots, KNOT_VALUES).toFixed(4)) : null,
    };
  }

  const near = storesNear(origin);
  building.chipCount = Object.fromEntries(CHIPS.map((chip) => [chip, 0]));
  let loud = 0;
  for (const store of near) {
    if (store.chip && building.chipCount[store.chip] !== undefined) building.chipCount[store.chip] += 1;
    if (store.loud) loud += 1;
  }
  building.storeTotal = near.length;
  building.noiseStore = loud;
  building.noiseRatio = near.length > 0 ? loud / near.length : 0;

  CHIPS.forEach((chip) => chipCounts[chip].push(building.chipCount[chip]));
  storeTotals.push(building.storeTotal);
  noiseRatios.push(building.noiseRatio);
}

// 백분위는 건물 단위 모집단(전처리 대상 전 주택) 기준으로 한 번만 계산한다.
const chipPct = Object.fromEntries(CHIPS.map((chip) => [chip, percentileRank(chipCounts[chip])]));
const bustlePct = percentileRank(storeTotals);
const noisePct = percentileRank(noiseRatios);

buildings.forEach((building, index) => {
  building.chipScore = Object.fromEntries(CHIPS.map((chip) => [chip, Number(chipPct[chip][index].toFixed(4))]));
  building.bustlePct = Number(bustlePct[index].toFixed(4));
  building.noisePct = Number(noisePct[index].toFixed(4));
});

// ── 6. 출력 ────────────────────────────────────────────────────────────
const sorted = [...buildings].sort((a, b) => a.address.localeCompare(b.address, "ko"));

const output = {
  generatedFrom: MASTER_FILES,
  detourFactor: DETOUR,
  storeRadiusM: STORE_RADIUS,
  chips: CHIPS,
  stats: {
    sourceRows: rows.length,
    validRows: validRows.length,
    buildings: sorted.length,
    units: sorted.reduce((s, b) => s + b.unitMap.size, 0),
    priceRows: sorted.reduce((s, b) => s + b.priceMap.size, 0),
  },
  buildings: sorted.map((building) => ({
    id: stableId(building.key),
    address: building.address,
    type: building.typeCode,
    rentalTypeLabel: building.rentalTypeLabel,
    gungu: building.gungu,
    complexName: building.complexName,
    lat: Number(building.lat.toFixed(7)),
    lng: Number(building.lng.toFixed(7)),
    houseType: building.houseType,
    completionYear: building.completionYear,
    ageLabel: building.ageLabel,
    elevator: building.elevator,
    parkingCount: building.parkingCount,
    householdCount: building.householdCount,
    buildingForm: building.buildingForm,
    heating: building.heating,
    noticeUrl: building.noticeUrl,
    applyPortal: building.applyPortal,
    dataSource: building.dataSource,
    updatedAt: building.updatedAt,
    priceDates: [...building.priceDates].sort(),
    eligibilitySummaries: [...building.eligibilitySummaries],
    supplyClasses: [...building.supplyClasses],
    sourceRowCount: building.rowCount,
    units: [...building.unitMap.values()],
    prices: [...building.priceMap.values()],
    scores: {
      infra: building.infra,
      education: building.education,
      chipCount: building.chipCount,
      chipScore: building.chipScore,
      storeTotal: building.storeTotal,
      noiseStore: building.noiseStore,
      noiseRatio: Number(building.noiseRatio.toFixed(4)),
      bustlePct: building.bustlePct,
      noisePct: building.noisePct,
    },
  })),
};

const target = join(DATA, "housing_index.json");
writeFileSync(target, JSON.stringify(output));
const sizeKb = (readFileSync(target).length / 1024).toFixed(0);
console.log(
  `완료 → data/housing_index.json (${sizeKb}KB)\n` +
    `  건물 ${output.stats.buildings} · 호실 ${output.stats.units} · 가격행 ${output.stats.priceRows}`,
);
