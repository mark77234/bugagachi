import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/common/PageContainer";
import { PageIntro } from "@/components/common/PageIntro";
import { InformationBanner } from "@/components/common/banners";
import { LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { HousingMapExplorer } from "@/components/map/HousingMapExplorer";

export const metadata: Metadata = {
  title: "전체 주택 지도 · 부가가치",
  description: "부산 공공임대 데모 주택 12곳을 지역, 임대 유형, 모집 상태별로 탐색하세요.",
};

export default function MapPage() {
  return (
    <PageContainer size="wide" className="py-6">
      <PageIntro
        eyebrow="부산 공공임대 전체 탐색"
        title="지도에서 전체 주택 둘러보기"
        description="자격 입력 없이 현재 보유한 부산 공공임대 데모 주택을 지도와 목록으로 비교할 수 있어요."
        badge={<Badge tone="primary">데모 데이터 12곳</Badge>}
        compact
      />
      <InformationBanner tone="warning" className="mb-4 py-3" title="실시간 모집공고가 아니에요">
        표시된 주택·가격·모집 상태는 시연용 데이터입니다. 신청 전 MyHome 등 공식 기관의 최신 공고를 확인하세요.
      </InformationBanner>
      <Suspense
        fallback={
          <div className="py-12">
            <LoadingState title="전체 주택 지도를 준비하고 있어요" />
          </div>
        }
      >
        <HousingMapExplorer />
      </Suspense>
    </PageContainer>
  );
}
