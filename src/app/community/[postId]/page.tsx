"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Flag, Heart, MessageSquare } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { InformationBanner } from "@/components/common/banners";
import { EmptyState } from "@/components/common/states";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { postById, BOARD_LABEL } from "@/mocks/community";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { cn } from "@/lib/utils";

export default function CommunityPostPage() {
  const params = useParams<{ postId: string }>();
  const post = postById(params.postId);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);

  if (!post) {
    return (
      <PageContainer size="narrow" className="py-12">
        <EmptyState
          title="게시글을 찾을 수 없어요"
          action={<Link href="/community" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>커뮤니티로</Link>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow" className="py-8">
      <Link href="/community" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> 커뮤니티로
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="primary">{BOARD_LABEL[post.board]}</Badge>
        {post.region && <Badge tone="neutral">{post.region}</Badge>}
        {post.type && <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[post.type]}</Badge>}
      </div>
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <p className="mt-2 flex items-center gap-3 text-sm text-muted">
        <span>{post.author}</span>
        <span>{post.createdAt}</span>
      </p>

      <Card className="mt-5">
        <CardBody>
          <p className="whitespace-pre-line leading-relaxed text-fg">{post.excerpt}</p>
          <p className="mt-4 text-sm text-muted">
            본문과 댓글은 커뮤니티에서 함께 확인할 수 있어요.
          </p>
        </CardBody>
      </Card>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="md">
          <Heart className="h-4 w-4" /> 좋아요 {post.likes}
        </Button>
        <Button variant="outline" size="md">
          <MessageSquare className="h-4 w-4" /> 댓글 {post.comments}
        </Button>
        <Button variant="ghost" size="md" className="ml-auto" onClick={() => setReportOpen(true)}>
          <Flag className="h-4 w-4" /> 신고
        </Button>
      </div>

      {reported && (
        <InformationBanner tone="primary" className="mt-4">
          신고가 접수됐어요. 운영 정책에 따라 검토됩니다.
        </InformationBanner>
      )}

      <ConfirmationDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onConfirm={() => setReported(true)}
        title="이 게시글을 신고할까요?"
        description="운영 정책 위반(허위정보·광고·비방 등)으로 판단되는 경우 신고해 주세요. 접수 후 운영팀이 검토해요."
        confirmLabel="신고하기"
      />
    </PageContainer>
  );
}
