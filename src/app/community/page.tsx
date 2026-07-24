"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Flag, Heart, MessageSquare, PenLine, Search } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { InformationBanner } from "@/components/common/banners";
import { EmptyState } from "@/components/common/states";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ToggleChip } from "@/components/ui/chip";
import { MOCK_POSTS, BOARD_LABEL, type BoardType } from "@/mocks/community";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { cn } from "@/lib/utils";

const BOARDS: { value: BoardType | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "qna", label: "질문" },
  { value: "review", label: "입주 후기" },
  { value: "info", label: "정보 공유" },
];

export default function CommunityPage() {
  const [board, setBoard] = useState<BoardType | "all">("all");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [q, setQ] = useState("");

  const posts = useMemo(() => {
    let list = MOCK_POSTS.filter((p) => (board === "all" || p.board === board) && (q === "" || p.title.includes(q) || p.excerpt.includes(q)));
    list = [...list].sort((a, b) => (sort === "popular" ? b.likes - a.likes : b.createdAt.localeCompare(a.createdAt)));
    return list;
  }, [board, sort, q]);

  return (
    <PageContainer size="default" className="py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader as="h1" eyebrow="커뮤니티" title="함께 나누는 공공임대 정보" description="공고 정보·입주 후기·질문을 나눠요." />
        <Link href="/community/write" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>
          <PenLine className="h-4 w-4" /> 글쓰기
        </Link>
      </div>

      <InformationBanner tone="primary" className="mb-5">
        모든 게시물은 운영 정책을 따라요. 부적절한 글은 <Flag className="inline h-3.5 w-3.5" aria-hidden /> 신고할 수 있어요.
      </InformationBanner>

      {/* 필터/검색 */}
      <div className="mb-5 space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap gap-2">
          {BOARDS.map((b) => (
            <ToggleChip key={b.value} label={b.label} selected={board === b.value} onToggle={() => setBoard(b.value)} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-sm font-semibold text-fg">
            게시글 검색
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input type="search" className="w-full pl-9" placeholder="제목·내용 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-fg">
            정렬
            <Select id="c-sort" value={sort} onChange={(e) => setSort(e.target.value as "recent" | "popular")}>
              <option value="recent">최신순</option>
              <option value="popular">인기순</option>
            </Select>
          </label>
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState title="검색 결과가 없어요" description="다른 게시판이나 검색어를 시도해 보세요." />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <article>
                <Card className="interactive-card">
                  <CardBody className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">{BOARD_LABEL[p.board]}</Badge>
                    {p.region && <Badge tone="neutral">{p.region}</Badge>}
                    {p.type && <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[p.type]}</Badge>}
                  </div>
                  <Link href={`/community/${p.id}`} className="block">
                    <h2 className="text-lg font-bold text-navy hover:text-primary">{p.title}</h2>
                    <p className="mt-1 text-sm text-muted">{p.excerpt}</p>
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <span>{p.author}</span>
                    <span>{p.createdAt}</span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" aria-hidden /> {p.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" aria-hidden /> {p.comments}
                    </span>
                  </div>
                  </CardBody>
                </Card>
              </article>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
