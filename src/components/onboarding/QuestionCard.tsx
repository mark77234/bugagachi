"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** 질문 카드: 제목 + 보조설명 + 입력영역 + 하단 이전/다음. 모바일은 하단 고정 바. */
export function QuestionCard({
  title,
  headingRef,
  helpId,
  description,
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
  headingRef?: React.Ref<HTMLHeadingElement>;
  helpId?: string;
  description?: string;
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
      <CardBody className="sm:p-8">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p id={helpId} className="mt-2 text-muted">
            {description}
          </p>
        )}
        <div className="mt-6">{children}</div>

        {/* 데스크톱 하단 액션 */}
        <div className="mt-8 hidden items-center justify-between sm:flex">
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
