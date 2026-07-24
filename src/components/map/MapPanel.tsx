"use client";

import { KakaoMapView } from "./KakaoMapView";
import { MockMapView, type MapViewProps } from "./MapView";

/** 지도 진입점. NEXT_PUBLIC_KAKAO_MAP_KEY 가 있으면 실제 카카오 지도, 없으면 mock.
 *  두 구현 모두 동일한 MapViewProps 인터페이스를 따른다. */
const HAS_KAKAO_KEY = Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY);

export function MapPanel(props: MapViewProps) {
  return HAS_KAKAO_KEY ? <KakaoMapView {...props} /> : <MockMapView {...props} />;
}
