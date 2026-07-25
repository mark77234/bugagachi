import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/common/PageContainer";
import { PageIntro } from "@/components/common/PageIntro";
import { InformationBanner } from "@/components/common/banners";
import { LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { DemoChat } from "@/components/chat/DemoChat";

export const metadata: Metadata = {
  title: "AI 갈붕이 · 부산 공공임대 추천·안내",
  description: "AI 갈붕이가 공공임대 유형, 자격 조건, 준비 서류와 신청 절차를 안내하고 맞춤 주택을 추천해요.",
};

export default function ChatPage() {
  return (
    <PageContainer size="wide" className="py-6">
      <PageIntro
        eyebrow="AI 갈붕이"
        title="AI 갈붕이에게 물어보고 추천받으세요"
        description="공공임대 유형·자격·서류·절차 안내부터 예산·생활 취향에 맞는 맞춤 주택 추천까지 도와드려요."
        badge={<Badge tone="primary">AI 임대주택 도우미</Badge>}
        compact
      />
      <InformationBanner tone="warning" className="mb-4 py-3" title="AI 답변은 참고용이에요">
        안내 내용은 참고용이에요. 최종 자격과 공고 내용은 공식 기관에서 확인해야 해요.
      </InformationBanner>
      <Suspense
        fallback={
          <div className="py-12">
            <LoadingState title="AI 갈붕이를 준비하고 있어요" />
          </div>
        }
      >
        <DemoChat />
      </Suspense>
    </PageContainer>
  );
}
