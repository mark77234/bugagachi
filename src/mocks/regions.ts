import type { LatLng } from "@/lib/coordinates";

/** 부산 16개 구·군. center는 mock 지도/거리 계산용 대략 좌표(WGS84). */
export interface Gungu {
  code: string;
  name: string;
  center: LatLng;
}

export const BUSAN_GUNGU: Gungu[] = [
  { code: "jung", name: "중구", center: { lat: 35.106, lng: 129.032 } },
  { code: "seo", name: "서구", center: { lat: 35.098, lng: 129.024 } },
  { code: "dong", name: "동구", center: { lat: 35.129, lng: 129.045 } },
  { code: "yeongdo", name: "영도구", center: { lat: 35.091, lng: 129.067 } },
  { code: "busanjin", name: "부산진구", center: { lat: 35.163, lng: 129.053 } },
  { code: "dongnae", name: "동래구", center: { lat: 35.204, lng: 129.084 } },
  { code: "nam", name: "남구", center: { lat: 35.136, lng: 129.084 } },
  { code: "buk", name: "북구", center: { lat: 35.197, lng: 128.99 } },
  { code: "haeundae", name: "해운대구", center: { lat: 35.163, lng: 129.163 } },
  { code: "saha", name: "사하구", center: { lat: 35.104, lng: 128.975 } },
  { code: "geumjeong", name: "금정구", center: { lat: 35.243, lng: 129.092 } },
  { code: "gangseo", name: "강서구", center: { lat: 35.212, lng: 128.98 } },
  { code: "yeonje", name: "연제구", center: { lat: 35.176, lng: 129.079 } },
  { code: "suyeong", name: "수영구", center: { lat: 35.145, lng: 129.113 } },
  { code: "sasang", name: "사상구", center: { lat: 35.152, lng: 128.991 } },
  { code: "gijang", name: "기장군", center: { lat: 35.244, lng: 129.222 } },
];

export const gunguByName = (name: string) => BUSAN_GUNGU.find((g) => g.name === name);
