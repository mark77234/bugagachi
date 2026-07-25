import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/common/states";
import { UnifiedMapExplorer } from "@/components/map/UnifiedMapExplorer";

export const metadata: Metadata = {
  title: "지도 · 부가가치",
  description: "부산 공공임대주택 전체와 내 취향 추천을 지도 한 화면에서 살펴보세요.",
};

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-[100dvh] place-items-center bg-bg">
          <LoadingState title="지도를 준비하고 있어요" pose="mapSearch" />
        </div>
      }
    >
      <UnifiedMapExplorer />
    </Suspense>
  );
}
