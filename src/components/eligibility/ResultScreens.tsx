"use client";

import Link from "next/link";
import { ArrowRight, Pencil, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { InformationBanner } from "@/components/common/banners";
import { EmptyState } from "@/components/common/states";
import { TypeResultCard } from "./TypeResultCard";
import { cn } from "@/lib/utils";
import type { EligibilityTypeResult } from "@/features/eligibility/eligibility.types";

function Group({ title, items }: { title: string; items: EligibilityTypeResult[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-bold text-muted">
        {title} <span className="text-primary">{items.length}</span>
      </h3>
      <div className="grid gap-3">
        {items.map((r) => (
          <TypeResultCard key={r.type} result={r} />
        ))}
      </div>
    </section>
  );
}

/** 1-1 중간 결과 */
export function Stage1Result({
  results,
  onContinue,
  onEdit,
}: {
  results: EligibilityTypeResult[];
  onContinue: () => void;
  onEdit: () => void;
}) {
  const candidates = results.filter((r) => r.evaluation.status !== "FAIL");
  const excluded = results.filter((r) => r.evaluation.status === "FAIL");

  return (
    <div>
      <InformationBanner tone="primary" title={`공통 자격 확인 완료 · 후보 ${candidates.length}개`} className="mb-6">
        아래 후보 유형은 세부 조건(계층·순위·출산 등)을 추가로 확인해요. 제외된 유형의 질문은 표시하지 않아요.
      </InformationBanner>

      <Group title="추가 확인이 필요한 후보 유형" items={candidates} />
      <Group title="현재 조건상 제외된 유형" items={excluded} />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="lg" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> 입력 수정
        </Button>
        <Button size="lg" onClick={onContinue} disabled={candidates.length === 0}>
          세부 자격 확인하기 <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** 1단계 최종 결과 */
export function FinalSummary({
  results,
  onEdit,
}: {
  results: EligibilityTypeResult[];
  onEdit: () => void;
}) {
  const pass = results.filter((r) => r.evaluation.status === "PASS");
  const needs = results.filter((r) => r.evaluation.status === "NEEDS_MORE");
  const fail = results.filter((r) => r.evaluation.status === "FAIL");

  return (
    <div>
      <InformationBanner tone="warning" title="이 결과는 자격 확정이 아니에요" className="mb-6">
        아래는 입력 기준의 참고 판정이에요. 실제 신청 가능 여부는 각 유형의 공식 모집공고로 확정됩니다.
      </InformationBanner>

      <Group title="신청 가능성이 있는 유형" items={pass} />
      <Group title="추가 확인이 필요한 유형" items={needs} />
      <Group title="현재 조건상 어려운 유형" items={fail} />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="lg" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> 입력 수정
        </Button>
        {pass.length > 0 ? (
          <Link href="/preferences" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
            2단계 취향 추천으로 <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Button size="lg" disabled>
            통과한 유형이 없어요
          </Button>
        )}
      </div>
    </div>
  );
}

/** 후보 0개 / 게이트 종료 화면 */
export function ExitScreen({
  reason,
  onEdit,
}: {
  reason: string;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-5">
      <EmptyState
        title="현재 조건으로는 신청 가능한 유형이 없어요"
        description={reason}
      />
      <InformationBanner tone="primary" title="다시 확인해 볼 항목">
        입력 내용을 수정하거나, 세대·소득·자산 조건이 바뀌면 다시 진단할 수 있어요. 실제 신청 가능 여부는 공식 모집공고에서
        확인하세요.
      </InformationBanner>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="outline" size="lg" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> 입력 수정
        </Button>
        <Link href="/recommendations" className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
          <RotateCcw className="h-4 w-4" /> 모집공고 둘러보기
        </Link>
      </div>
    </div>
  );
}
