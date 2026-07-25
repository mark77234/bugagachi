"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** 질문 카드: 제목 + 보조설명 + 입력영역 + 하단 이전/다음. 모바일은 하단 고정 바. */
export function QuestionCard({
  title,
  eyebrow,
  headingRef,
  helpId,
  description,
  headerAction,
  children,
  onPrev,
  onNext,
  onSkip,
  nextDisabled,
  nextLabel = "다음",
  isLast,
  autoSaveHint = "자동 저장됨",
  remainingHint,
}: {
  title: string;
  eyebrow?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  helpId?: string;
  description?: string;
  /** 카드 내부 우측 상단 보조 액션 (예: 단계 전체 건너뛰기) */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  isLast?: boolean;
  autoSaveHint?: string;
  remainingHint?: string;
}) {
  return (
    <Card className="overflow-visible">
      <CardBody className="pb-24 sm:p-8 sm:pb-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="mb-1.5 text-sm font-bold text-primary">{eyebrow}</p>}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-balance text-xl font-bold leading-snug outline-none sm:text-2xl"
            >
              {title}
            </h2>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
        {description && (
          <p id={helpId} className="mt-2 text-muted">
            {description}
          </p>
        )}
        <div className="mt-6">{children}</div>

        {/* 데스크톱 하단 액션 */}
        <div className="mt-8 hidden items-center justify-between border-t border-border pt-5 sm:flex">
          <div className="text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Check className="h-4 w-4 text-success" aria-hidden /> {autoSaveHint}
            </span>
            {remainingHint && <span className="ml-3">· {remainingHint}</span>}
          </div>
          <div className="flex gap-2">
            {onPrev && (
              <Button variant="outline" size="md" onClick={onPrev}>
                <ArrowLeft className="h-4 w-4" /> 이전
              </Button>
            )}
            {onSkip && (
              <Button variant="ghost" size="md" onClick={onSkip}>
                건너뛰기
              </Button>
            )}
            <Button size="md" onClick={onNext} disabled={nextDisabled}>
              {isLast ? "완료" : nextLabel} {!isLast && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardBody>

      {/* 모바일 고정 하단 바 */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 pt-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          {onPrev && (
            <Button variant="outline" size="lg" onClick={onPrev} className="flex-1">
              <ArrowLeft className="h-4 w-4" /> 이전
            </Button>
          )}
          {onSkip && (
            <Button variant="ghost" size="lg" onClick={onSkip} className="flex-1">
              건너뛰기
            </Button>
          )}
          <Button size="lg" onClick={onNext} disabled={nextDisabled} className="flex-[2]">
            {isLast ? "완료" : nextLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}
