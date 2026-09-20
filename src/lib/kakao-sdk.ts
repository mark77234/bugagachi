/**
 * Kakao Maps JavaScript SDK 로더 + 장소 검색(services.Places).
 *
 * 지도(KakaoMapView)와 장소 검색(AddressSearch)이 같은 script 태그 하나를 공유한다.
 * 키는 NEXT_PUBLIC_KAKAO_MAP_KEY (브라우저에서 쓰는 공개 식별 키) 하나만 쓴다.
 */
import type { LatLng } from "./coordinates";
import type { GeocodedDestination } from "@/features/recommendation/recommendation.types";

const SDK_ID = "kakao-maps-sdk";
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

/** 지도 API 표면이 넓어 전역 선언은 느슨하게 두고, 이 파일이 실제로 쓰는 부분만 아래에서 좁힌다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KakaoNamespace = any;

declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

/** 지도와 장소 검색이 공유하는 부산 중심 좌표. */
export const BUSAN_CENTER: LatLng = { lat: 35.16, lng: 129.07 };
/** 검색어 최소 길이. 한 글자로는 의미 있는 장소 검색이 안 된다. */
export const MIN_KEYWORD_LENGTH = 2;
/**
 * keywordSearch 의 radius 는 가중치가 아니라 하드 필터다 (공식 기본값 5000m, 최대 20000m).
 * 부산 중심에서 5km 면 부산대학교(약 8km)도 걸러지므로, 부산 전역을 덮도록 최대값을 쓴다.
 */
const BUSAN_RADIUS_M = 20000;
/** 한 번에 보여줄 결과 수 (Kakao 허용 1~15). */
const RESULT_SIZE = 10;

/** keywordSearch 결과 한 건. 필드는 Local REST API "키워드로 장소 검색" 응답과 같다. */
export interface KakaoPlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  category_group_name: string;
  phone: string;
  /** 경도(lng). 위도가 아니다. */
  x: string;
  /** 위도(lat). 경도가 아니다. */
  y: string;
}

export type KakaoSearchStatus = "OK" | "ZERO_RESULT" | "ERROR";

interface KeywordSearchOptions {
  /** kakao.maps.LatLng 인스턴스. */
  location?: object;
  radius?: number;
  sort?: string;
  size?: number;
}

export interface KakaoPlacesService {
  keywordSearch(
    keyword: string,
    // 세 번째 pagination 인자는 쓰지 않아 선언하지 않는다.
    callback: (result: KakaoPlace[] | null, status: KakaoSearchStatus) => void,
    options?: KeywordSearchOptions,
  ): void;
}

/** SDK 에서 장소 검색에 필요한 부분만 좁은 타입으로 꺼낸 것. */
export interface PlaceSearchApi {
  places: KakaoPlacesService;
  status: Record<"OK" | "ZERO_RESULT" | "ERROR", KakaoSearchStatus>;
  sortByAccuracy: string;
  latLng: (coord: LatLng) => object;
}

let sdkPromise: Promise<KakaoNamespace> | null = null;

/**
 * SDK script 를 한 번만 삽입하고, 동시에 호출돼도 같은 Promise 를 공유한다.
 * 실패하면 캐시를 비워 다음 호출(재시도 버튼)이 다시 시도할 수 있게 한다.
 */
export function loadKakaoSdk(): Promise<KakaoNamespace> {
  sdkPromise ??= new Promise<KakaoNamespace>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (!KAKAO_KEY) return reject(new Error("no kakao key"));
    if (window.kakao?.maps?.services) return resolve(window.kakao);

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    const onReady = () => window.kakao.maps.load(() => resolve(window.kakao));
    if (existing) {
      if (window.kakao) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("sdk error")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = SDK_ID;
    s.async = true;
    // services 라이브러리가 있어야 kakao.maps.services.Places 를 쓸 수 있다.
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    s.addEventListener("load", onReady, { once: true });
    s.addEventListener("error", () => reject(new Error("sdk error")), { once: true });
    document.head.appendChild(s);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}

/** SDK 를 로드하고 장소 검색 객체를 꺼낸다. services 라이브러리가 없으면 예외. */
export async function loadPlaceSearch(): Promise<PlaceSearchApi> {
  const kakao = await loadKakaoSdk();
  const services = kakao.maps?.services;
  if (!services?.Places) throw new Error("kakao services library missing");
  return {
    places: new services.Places() as KakaoPlacesService,
    status: services.Status,
    sortByAccuracy: services.SortBy.ACCURACY,
    latLng: (coord) => new kakao.maps.LatLng(coord.lat, coord.lng),
  };
}

export type PlaceSearchOutcome =
  | { status: "ok"; places: KakaoPlace[] }
  | { status: "empty" }
  | { status: "error" }
  | { status: "sdk-error" };

function keywordSearchOnce(
  api: PlaceSearchApi,
  keyword: string,
  options: KeywordSearchOptions,
): Promise<{ status: KakaoSearchStatus; places: KakaoPlace[] }> {
  return new Promise((resolve) => {
    api.places.keywordSearch(keyword, (result, status) => resolve({ status, places: result ?? [] }), options);
  });
}

/**
 * 부산 반경 안에서 먼저 찾고, 결과가 없을 때만 전국으로 한 번 더 찾는다.
 * radius 가 하드 필터라 부산 우선과 전국 허용을 한 번의 호출로는 만들 수 없다.
 */
export async function searchPlaces(
  keyword: string,
  load: () => Promise<PlaceSearchApi> = loadPlaceSearch,
): Promise<PlaceSearchOutcome> {
  let api: PlaceSearchApi;
  try {
    api = await load();
  } catch {
    return { status: "sdk-error" };
  }

  const nearby = await keywordSearchOnce(api, keyword, {
    location: api.latLng(BUSAN_CENTER),
    radius: BUSAN_RADIUS_M,
    sort: api.sortByAccuracy,
    size: RESULT_SIZE,
  });
  if (nearby.status === api.status.OK) return { status: "ok", places: nearby.places };
  if (nearby.status === api.status.ERROR) return { status: "error" };

  const nationwide = await keywordSearchOnce(api, keyword, {
    sort: api.sortByAccuracy,
    size: RESULT_SIZE,
  });
  if (nationwide.status === api.status.OK) return { status: "ok", places: nationwide.places };
  return { status: nationwide.status === api.status.ERROR ? "error" : "empty" };
}

/** 조합 중인 낱자(ㄱ, ㅏ 등)로 끝나면 아직 글자가 완성되지 않은 상태다. */
const TRAILING_HANGUL_JAMO = /[ㄱ-ㆎ]$/;

/** 검색을 보낼 만한 검색어인지. 앞뒤 공백은 호출부에서 이미 제거한 값을 받는다. */
export function shouldSearchKeyword(keyword: string): boolean {
  return keyword.length >= MIN_KEYWORD_LENGTH && !TRAILING_HANGUL_JAMO.test(keyword);
}

/** 빈 문자열은 Number("") === 0 이라 그냥 변환하면 좌표 (0,0) 이 되어버린다. 먼저 걸러낸다. */
function parseCoord(value: string): number {
  return value?.trim() ? Number(value) : NaN;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/**
 * Kakao 장소 → 추천 앵커. 좌표가 유효하지 않으면 null 을 돌려주고, 임의 좌표로 보정하지 않는다.
 * place.x 가 경도(lng), place.y 가 위도(lat)다.
 */
export function toFrequentDestination(place: KakaoPlace, alias: string): GeocodedDestination | null {
  const lat = parseCoord(place.y);
  const lng = parseCoord(place.x);
  if (!isValidCoord(lat, lng)) return null;
  return {
    id: place.id,
    label: alias.trim() || place.place_name,
    address: place.road_address_name || place.address_name,
    coord: { lat, lng },
  };
}
