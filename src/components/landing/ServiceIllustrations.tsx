import { MascotVideo } from "@/components/common/MascotVideo";

/**
 * 랜딩 서비스 카드용 마스코트 영상 (카드 전체 배경을 꽉 채움).
 * ServiceEntryCard의 illustrationFill 모드와 함께 사용.
 */

/** 추천(대형 primary 카드): 집을 고르는 영상. */
export function RecommendationIllustration() {
  return (
    <MascotVideo
      src="pickHouse"
      poster="present"
      fullPoster
      className="h-full w-full"
      objectClassName="object-cover object-right"
    />
  );
}

/** AI 안내(warm 카드): 궁금증을 푸는 영상. */
export function ChatIllustration() {
  return (
    <MascotVideo
      src="question"
      poster="readDocument"
      fullPoster
      className="h-full w-full"
      objectClassName="object-cover object-center"
    />
  );
}

/** 지도(map 카드): 지도 위 탐색 영상. */
export function MapIllustration() {
  return (
    <MascotVideo
      src="onTheMap"
      poster="mapLocation"
      fullPoster
      className="h-full w-full"
      objectClassName="object-cover object-center"
    />
  );
}
