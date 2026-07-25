import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/common/states";
import { HousingMapExplorer } from "@/components/map/HousingMapExplorer";

export const metadata: Metadata = {
  title: "지도 · 부가가치",
  description: "부산 공공임대주택을 지도에서 한눈에 탐색하세요.",
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
      <HousingMapExplorer />
    </Suspense>
  );
}
