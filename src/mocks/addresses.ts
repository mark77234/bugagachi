/** Mock 도로명주소 자동완성 (Q2). 실제 주소검색 API는 adapter로 교체.
 *  services/geo/geocoder 가 이 형태({label, coord})를 반환하도록 하면 화면 불변. */
import type { LatLng } from "@/lib/coordinates";

export interface AddressSuggestion {
  address: string;
  coord: LatLng;
}

const SAMPLE: AddressSuggestion[] = [
  { address: "부산광역시 부산진구 중앙대로 668 (부전동)", coord: { lat: 35.1601, lng: 129.0563 } },
  { address: "부산광역시 해운대구 센텀중앙로 79 (우동)", coord: { lat: 35.1699, lng: 129.1301 } },
  { address: "부산광역시 남구 수영로 309 (대연동)", coord: { lat: 35.1362, lng: 129.0898 } },
  { address: "부산광역시 금정구 부산대학로 63 (장전동)", coord: { lat: 35.2314, lng: 129.0844 } },
  { address: "부산광역시 동래구 충렬대로 187 (안락동)", coord: { lat: 35.2019, lng: 129.0977 } },
  { address: "부산광역시 연제구 중앙대로 1001 (연산동)", coord: { lat: 35.1795, lng: 129.0756 } },
  { address: "부산광역시 사하구 낙동대로 550 (하단동)", coord: { lat: 35.1064, lng: 128.9668 } },
  { address: "부산광역시 강서구 명지국제6로 (명지동)", coord: { lat: 35.0938, lng: 128.9105 } },
  { address: "부산광역시 수영구 광안해변로 219 (광안동)", coord: { lat: 35.1533, lng: 129.1187 } },
  { address: "부산광역시 북구 금곡대로 271 (화명동)", coord: { lat: 35.2364, lng: 129.0121 } },
  { address: "부산광역시 사상구 학감대로 105 (감전동)", coord: { lat: 35.1546, lng: 128.9905 } },
  { address: "부산광역시 기장군 기장대로 560 (기장읍)", coord: { lat: 35.2445, lng: 129.2224 } },
];

/** 부분 문자열 매칭 mock 자동완성. */
export function searchAddress(query: string): AddressSuggestion[] {
  const q = query.trim();
  if (!q) return [];
  return SAMPLE.filter((s) => s.address.includes(q)).slice(0, 6);
}

export const SAMPLE_ADDRESSES = SAMPLE;
