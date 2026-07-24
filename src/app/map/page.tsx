import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/common/states";
import { HousingMapExplorer } from "@/components/map/HousingMapExplorer";

export const metadata: Metadata = {
  title: "전체 주택 지도 · 부가가치",
  description: "부산 공공임대주택을 건물 단위로 지도에서 탐색하세요.",
};

export default function MapPage() {
  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-bg md:h-dvh md:min-h-0 md:overflow-hidden">
      <Suspense
        fallback={
          <div className="grid min-h-[70dvh] place-items-center">
            <LoadingState title="전체 주택 지도를 준비하고 있어요" />
          </div>
        }
      >
        <HousingMapExplorer />
      </Suspense>
    </div>
  );
}
