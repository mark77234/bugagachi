"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { InformationBanner } from "@/components/common/banners";
import { Card, CardBody } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RadioCards } from "@/components/ui/selectable";
import { BOARD_LABEL, type BoardType } from "@/mocks/community";
import { BUSAN_GUNGU } from "@/mocks/regions";
import { cn } from "@/lib/utils";

export default function CommunityWritePage() {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = board !== null && title.trim() !== "" && body.trim() !== "";

  if (submitted) {
    return (
      <PageContainer size="narrow" className="py-12">
        <Card>
          <CardBody className="text-center">
            <h1 className="text-xl font-bold">작성이 완료됐어요 (데모)</h1>
            <p className="mt-2 text-muted">실제 서비스에서는 게시판에 등록돼요. 지금은 mock 화면이라 저장되지 않아요.</p>
            <Link href="/community" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-6")}>
              커뮤니티로 돌아가기
            </Link>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow" className="py-8">
      <Link href="/community" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> 커뮤니티로
      </Link>
      <h1 className="text-2xl font-bold">글쓰기</h1>
      <InformationBanner tone="warning" className="my-5">
        개인정보(연락처·주민번호 등)나 허위·광고성 글은 운영 정책에 따라 제한될 수 있어요.
      </InformationBanner>

      <Card>
        <CardBody className="space-y-5">
          <fieldset>
            <legend className="mb-3 font-semibold">게시판</legend>
            <RadioCards<BoardType>
              name="board"
              columns={3}
              value={board}
              onChange={setBoard}
              options={(Object.keys(BOARD_LABEL) as BoardType[]).map((b) => ({ value: b, label: BOARD_LABEL[b] }))}
            />
          </fieldset>

          <label className="block">
            <span className="mb-1 block font-semibold">지역 (선택)</span>
            <Select defaultValue="">
              <option value="">선택 안 함</option>
              {BUSAN_GUNGU.map((g) => (
                <option key={g.code} value={g.name}>
                  {g.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1 block font-semibold">제목</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" />
          </label>

          <label className="block">
            <span className="mb-1 block font-semibold">내용</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="내용을 입력하세요"
              className="w-full rounded-[var(--radius-input)] border border-border bg-surface p-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Link href="/community" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              취소
            </Link>
            <Button size="lg" disabled={!canSubmit} onClick={() => setSubmitted(true)}>
              등록 (데모)
            </Button>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
