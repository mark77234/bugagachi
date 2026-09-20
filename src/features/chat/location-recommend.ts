/**
 * 채팅의 "OO 근처 주택" 요청을 코드로 처리한다.
 *
 * 기존에는 LLM 에게 355개 주택을 `[id] 이름 · 구군 · 유형 · 가격` 으로만 넘겼다.
 * 주소도 좌표도 없으니 "초읍"(부산진구의 한 동) 같은 동 단위 지명은 모델이 추측할 수밖에 없었다.
 * 그래서 위치 해석 → 거리 계산 → 후보 제한까지 여기서 끝내고, 모델에는 후보만 넘긴다.
 *
 * Kakao Places 는 브라우저 SDK 라서 이 모듈의 비동기 부분은 클라이언트에서만 돈다.
 * 순수 함수(추출·거리·후보 선정·ID 검증)는 서버/테스트에서도 그대로 쓸 수 있다.
 */
// mocks/housing 은 대용량 JSON 을 로드해 node --test 에서 뜨지 않으므로 타입만 가져온다.
import { haversineMeters } from "@/lib/coordinates";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { FREQUENT_STEPS } from "@/features/recommendation/scoring.config";
import { searchPlaces, toFrequentDestination, type PlaceSearchApi } from "@/lib/kakao-sdk";
import type { LatLng } from "@/lib/coordinates";
import type { HousingUnit, RentalCondition } from "@/mocks/housing";
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";
import type { FrequentDestination } from "@/features/recommendation/recommendation.types";

/** mocks/housing 의 matchingConditions 와 같은 규칙.
 *  그 파일은 대용량 JSON 을 로드해 여기서 런타임으로 끌어올 수 없어 규칙만 따로 둔다. */
function conditionsWithinBudget(unit: HousingUnit, budget: Budget): RentalCondition[] {
  return unit.conditions.filter(
    (condition) => condition.deposit <= budget.maxDeposit && condition.monthlyRent <= budget.maxMonthlyRent,
  );
}

/**
 * 반경 확대 단계(m). 새 숫자를 만들지 않고 2단계 추천의 '자주 가는 장소' 계단
 * (scoring.config FREQUENT_STEPS: 5km 만점 → 10km → 30km 0점)과 같은 경계를 쓴다.
 */
export const SEARCH_RADII_M: number[] = FREQUENT_STEPS.map((step) => step.d);

/** 모델에 넘길 최대 후보 수. 프롬프트가 2~3곳 추천이라 설명 여지를 두고 조금 넉넉히 준다. */
export const MAX_CANDIDATES = 8;

/** 장소명이 이보다 짧으면 Kakao 검색을 보내지 않고 되묻는다. */
const MIN_PLACE_LENGTH = 2;

/** "근처/주변" 앞에 오는 말이 이런 지시어뿐이면 기준 장소를 특정할 수 없다. */
const VAGUE_PLACES = new Set(["여기", "저기", "거기", "이", "그", "저", "우리", "요기", "이곳", "그곳"]);

/** 위치 요청으로 볼 관계 표현. */
const NEAR_MARKER = "(?:근처|주변|인근|부근|일대|가까운|가까이|가깝)";
/** 주택을 찾는 맥락인지. 이게 없으면 Kakao 검색을 걸지 않는다 (일반 대화 보호). */
const HOUSING_WORD = /(주택|집|임대|매물|단지|물건|곳|추천)/;

/** 장소 뒤에 붙는 조사 — 캡처에서 떼어낸다. */
const TRAILING_PARTICLE = /(?:에서|에게|에|은|는|이|가|을|를|의|로|으로|랑|와|과|하고)$/;

const PLACE_RE = new RegExp(
  `([가-힣A-Za-z0-9·\\-]+(?:\\s+[가-힣A-Za-z0-9·\\-]+){0,2}?)\\s*${NEAR_MARKER}`,
);

/**
 * 메시지에서 기준 장소명을 뽑는다.
 * 위치 요청이 아니면 null, 위치 요청 같은데 장소를 못 집으면 빈 문자열을 돌려준다.
 */
export function extractLocationQuery(message: string): string | null | "" {
  const text = message.trim();
  if (!text) return null;
  if (!new RegExp(NEAR_MARKER).test(text)) return null;
  if (!HOUSING_WORD.test(text)) return null;

  const matched = PLACE_RE.exec(text);
  if (!matched) return "";

  const place = matched[1].replace(TRAILING_PARTICLE, "").trim();
  if (!place || VAGUE_PLACES.has(place)) return "";
  if (place.length < MIN_PLACE_LENGTH) return "";
  return place;
}

export interface LocationAnchor {
  /** Kakao 장소명 또는 사용자가 저장한 별칭. */
  name: string;
  address: string;
  coord: LatLng;
  /** kakao = 장소 검색 결과, saved = 사용자가 저장해 둔 '자주 가는 장소'. */
  source: "kakao" | "saved";
}

/** 모델에 넘기는 후보 한 건. 원본 주택 데이터를 통째로 보내지 않는다. */
export interface ChatHousingCandidate {
  id: string;
  name: string;
  address: string;
  /** 코드가 Haversine 으로 계산한 직선거리(m). 모델이 다시 추정하면 안 된다. */
  distanceMeters: number;
  type: string;
  deposit?: number;
  monthlyRent?: number;
  fitsBudget?: boolean;
}

export interface Budget {
  maxDeposit: number;
  maxMonthlyRent: number;
}

export interface NearbySelection {
  candidates: ChatHousingCandidate[];
  /** 후보를 담아낸 반경(m). 어느 단계에도 안 들어오면 null. */
  radiusMeters: number | null;
  /** 첫 반경(5km)을 넘겨 확대했는지. */
  widened: boolean;
  /** 마지막 반경 밖이라 "가장 가까운 곳"만 보여주는 상태. */
  outOfRange: boolean;
  /** 자격 유형으로 거르면 후보가 0이라 조건을 완화했는지. */
  relaxedType: boolean;
  /** 예산으로 거르면 후보가 0이라 조건을 완화했는지. */
  relaxedBudget: boolean;
}

function isUsableCoord(coord: LatLng | undefined): coord is LatLng {
  return (
    !!coord &&
    Number.isFinite(coord.lat) &&
    Number.isFinite(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}

/**
 * 기준 좌표에서 가까운 주택 후보를 고른다.
 * 자격 → 예산 → 거리 순으로 좁히되, 어느 단계에서 0건이 되면 그 조건만 풀고 그 사실을 알린다.
 * 좌표가 없거나 값이 이상한 주택은 후보에서 빼고, 절대 좌표를 지어내지 않는다.
 */
export function pickNearby(
  anchor: LatLng,
  units: HousingUnit[],
  options: { eligibleTypes?: EligibilityTypeCode[]; budget?: Budget | null; max?: number } = {},
): NearbySelection {
  const { eligibleTypes, budget, max = MAX_CANDIDATES } = options;

  const measured = units
    .filter((unit) => isUsableCoord(unit.coord))
    .map((unit) => ({ unit, distanceMeters: Math.round(haversineMeters(anchor, unit.coord)) }))
    .filter((row) => Number.isFinite(row.distanceMeters))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const typed = eligibleTypes?.length
    ? measured.filter((row) => eligibleTypes.includes(row.unit.type))
    : measured;
  const relaxedType = Boolean(eligibleTypes?.length) && typed.length === 0;
  const afterType = typed.length > 0 ? typed : measured;

  const budgeted = budget
    ? afterType.filter((row) => conditionsWithinBudget(row.unit, budget).length > 0)
    : afterType;
  const relaxedBudget = Boolean(budget) && budgeted.length === 0;
  const pool = budgeted.length > 0 ? budgeted : afterType;

  const toCandidate = (row: { unit: HousingUnit; distanceMeters: number }): ChatHousingCandidate => {
    const fitting = budget ? conditionsWithinBudget(row.unit, budget) : row.unit.conditions;
    const cheapest = [...fitting].sort((a, b) => a.monthlyRent - b.monthlyRent)[0];
    return {
      id: row.unit.id,
      name: row.unit.name,
      address: row.unit.address,
      distanceMeters: row.distanceMeters,
      type: ELIGIBILITY_TYPE_LABEL[row.unit.type],
      ...(cheapest ? { deposit: cheapest.deposit, monthlyRent: cheapest.monthlyRent } : {}),
      ...(budget ? { fitsBudget: fitting.length > 0 } : {}),
    };
  };

  for (const radius of SEARCH_RADII_M) {
    const within = pool.filter((row) => row.distanceMeters <= radius);
    if (within.length > 0) {
      return {
        candidates: within.slice(0, max).map(toCandidate),
        radiusMeters: radius,
        widened: radius !== SEARCH_RADII_M[0],
        outOfRange: false,
        relaxedType,
        relaxedBudget,
      };
    }
  }

  // 마지막 반경 밖 — "근처"라고 하지 않고 가장 가까운 곳만 거리와 함께 보여준다.
  return {
    candidates: pool.slice(0, max).map(toCandidate),
    radiusMeters: null,
    widened: true,
    outOfRange: true,
    relaxedType,
    relaxedBudget,
  };
}

/**
 * "(도보 2~3분)" 처럼 괄호로 덧붙인 이동시간 주장을 지운다.
 * 우리는 직선거리만 계산하므로 소요시간은 근거가 없는데, 프롬프트로 금지해도
 * 모델이 붙이는 걸 실제로 확인했다.
 *
 * 괄호 단위로만 지운다 — 문장 속 표현까지 잘라내면 조사가 남아
 * "서면역에서로 이동 가능한" 같은 깨진 문장이 된다 (실측으로 확인).
 * 문장 속 표현은 프롬프트 규칙에 맡긴다.
 */
const TRAVEL_TIME_PAREN_RE =
  /\s*[（(]\s*(?:도보|걸어서|차로|차량으로|자동차로|버스로|지하철로)[^)）]{0,20}?\d+\s*(?:[~\-–]\s*\d+\s*)?분[^)）]{0,10}?[)）]/g;

export function stripTravelTimeClaims(text: string): string {
  return text.replace(TRAVEL_TIME_PAREN_RE, "");
}

/** 모델이 후보 밖 id 를 돌려줘도 화면·지도에 나가지 않게 거른다. */
export function keepKnownIds(ids: string[], allowedIds: string[]): string[] {
  const allowed = new Set(allowedIds);
  return ids.filter((id) => allowed.has(id));
}

/** 서버에 보내는 위치 컨텍스트. /api/chat 이 그대로 프롬프트에 넣는다. */
export interface LocationPayload {
  anchor: LocationAnchor;
  radiusMeters: number | null;
  outOfRange: boolean;
  relaxedType: boolean;
  relaxedBudget: boolean;
  candidates: ChatHousingCandidate[];
}

export type LocationOutcome =
  /** 위치 요청이 아니다 — 기존 대화 흐름 그대로. */
  | { kind: "none" }
  /** 사용자에게 되물어야 한다 (AI 호출 안 함). */
  | { kind: "ask"; message: string }
  /** 후보 확보 완료. */
  | { kind: "ok"; payload: LocationPayload };

const ASK_PLACE = "어느 장소를 기준으로 찾아볼까요? 동네, 역, 학교 또는 건물명을 알려주세요.";

/**
 * 메시지 한 건을 위치 요청으로 해석한다. 위치 요청이 아니면 Kakao 검색을 하지 않는다.
 * 저장해 둔 '자주 가는 장소' 별칭("직장", "학교")이 먼저 맞으면 그 좌표를 쓰고 검색을 건너뛴다.
 */
export async function resolveLocationRequest(
  message: string,
  context: {
    units: HousingUnit[];
    frequent?: FrequentDestination[];
    eligibleTypes?: EligibilityTypeCode[];
    budget?: Budget | null;
  },
  deps: { search?: typeof searchPlaces; load?: () => Promise<PlaceSearchApi> } = {},
): Promise<LocationOutcome> {
  const query = extractLocationQuery(message);
  if (query === null) return { kind: "none" };
  if (query === "") return { kind: "ask", message: ASK_PLACE };

  // 1) 사용자가 저장해 둔 기준 장소 별칭 우선 (검색 비용 0, 사용자의 명시적 좌표)
  const saved = (context.frequent ?? []).find(
    (destination) => destination.label.trim() === query && isUsableCoord(destination.coord),
  );
  let anchor: LocationAnchor | null =
    saved && saved.coord
      ? { name: saved.label, address: saved.address, coord: saved.coord, source: "saved" }
      : null;

  // 2) Kakao 장소 검색
  if (!anchor) {
    const search = deps.search ?? searchPlaces;
    const outcome = await search(query, deps.load);
    if (outcome.status === "sdk-error") {
      return {
        kind: "ask",
        message: "지도 서비스를 불러오지 못해 위치를 찾을 수 없어요. 잠시 후 다시 시도해 주세요.",
      };
    }
    if (outcome.status === "error") {
      return {
        kind: "ask",
        message: "장소 검색 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
    if (outcome.status === "empty" || outcome.places.length === 0) {
      return {
        kind: "ask",
        message: `'${query}'의 정확한 위치를 찾지 못했어요. 역, 학교 또는 건물명을 조금 더 구체적으로 입력해 주세요.`,
      };
    }
    // searchPlaces 가 정확도순(부산 반경 우선)으로 돌려주므로 첫 결과를 기준으로 삼고,
    // 어디를 기준으로 삼았는지는 답변에 반드시 명시하게 한다 (프롬프트 규칙).
    const destination = toFrequentDestination(outcome.places[0], "");
    if (!destination?.coord) {
      return {
        kind: "ask",
        message: `'${query}'의 좌표를 확인하지 못했어요. 다른 장소명으로 다시 알려주세요.`,
      };
    }
    anchor = {
      name: destination.label,
      address: destination.address,
      coord: destination.coord,
      source: "kakao",
    };
  }

  const selection = pickNearby(anchor.coord, context.units, {
    eligibleTypes: context.eligibleTypes,
    budget: context.budget,
  });

  if (selection.candidates.length === 0) {
    return { kind: "ask", message: "해당 위치와 비교할 수 있는 주택 좌표 정보가 부족해요." };
  }

  return {
    kind: "ok",
    payload: {
      anchor,
      radiusMeters: selection.radiusMeters,
      outOfRange: selection.outOfRange,
      relaxedType: selection.relaxedType,
      relaxedBudget: selection.relaxedBudget,
      candidates: selection.candidates,
    },
  };
}
