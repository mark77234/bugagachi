import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/common/PageContainer";
import { PageIntro } from "@/components/common/PageIntro";
import { InformationBanner } from "@/components/common/banners";
import { LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { DemoChat } from "@/components/chat/DemoChat";

export const metadata: Metadata = {
  title: "공공임대 AI 안내 · 부가가치",
  description: "공공임대 유형, 자격 조건, 준비 서류와 신청 절차를 쉬운 말로 안내해요.",
};

export default function ChatPage() {
  return (
    <PageContainer size="wide" className="py-6">
      <PageIntro
        eyebrow="공공임대 정보 안내"
        title="궁금한 점을 편하게 물어보세요"
        description="임대 유형, 자격 조건, 준비 서류와 신청 절차에 관한 기본 질문을 쉬운 말로 안내해요."
        badge={<Badge tone="warning">AI 안내</Badge>}
        compact
      />
      <InformationBanner tone="warning" className="mb-4 py-3" title="AI 답변은 참고용이에요">
        안내 내용은 참고용이에요. 최종 자격과 공고 내용은 공식 기관에서 확인해야 해요.
      </InformationBanner>
      <Suspense
        fallback={
          <div className="py-12">
            <LoadingState title="안내 도우미를 준비하고 있어요" />
          </div>
        }
      >
        <DemoChat />
      </Suspense>
    </PageContainer>
  );
}
