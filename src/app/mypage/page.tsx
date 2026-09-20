"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Bookmark, ClipboardCheck, Clock, Pencil, Trash2, UserCircle2 } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { LoadingState } from "@/components/common/states";
import { Mascot } from "@/components/common/Mascot";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { usePreferencesStore, isBudgetComplete } from "@/features/recommendation/preferences.store";
import { useUserStore } from "@/features/user/user.store";
import { useHydrated } from "@/lib/use-hydrated";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { housingById, bestCondition } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";

function Tile({ title, icon, children, className, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <Card className={className}>
      <CardBody className="h-full">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-bold text-navy">
            <span className="shrink-0 text-primary">{icon}</span> <span className="truncate">{title}</span>
          </h2>
          {action}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

/**
 * 주택 한 줄. 본문은 상세 페이지 링크다.
 * onUnsave 를 넘기면 오른쪽에 북마크 버튼이 붙는다 — 링크의 형제 요소라 본문 이동과 섞이지 않는다.
 */
function HousingMini({ id, onUnsave }: { id: string; onUnsave?: (id: string) => void }) {
  const u = housingById(id);
  if (!u) return null;
  const best = bestCondition(u);
  const summary = (
    <>
      <span className="block truncate font-medium text-fg">{u.name}</span>
      <span className="block text-sm text-muted">
        {u.gungu} ·{" "}
        {best
          ? `보증금 ${formatManwon(best.deposit)} · 월 ${formatManwon(best.monthlyRent)}`
          : "임대조건 미공개"}
      </span>
    </>
  );

  if (!onUnsave) {
    return (
      <Link href={`/housing/${u.id}`} className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-border p-3 hover:bg-surface-muted">
        <span className="min-w-0">{summary}</span>
        <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[u.type]}</Badge>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-input)] border border-border">
      <Link
        href={`/housing/${u.id}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-l-[var(--radius-input)] p-3 hover:bg-surface-muted"
      >
        <span className="min-w-0">{summary}</span>
        <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[u.type]}</Badge>
      </Link>
      <button
        type="button"
        onClick={(event) => {
          // 형제 요소라 링크로 번지지 않지만, 마크업이 바뀌어도 안전하도록 막아 둔다.
          event.preventDefault();
          event.stopPropagation();
          onUnsave(u.id);
        }}
        aria-pressed
        aria-label={`${u.name} 저장 해제`}
        className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary bg-primary-subtle text-primary transition-colors hover:border-error/40 hover:bg-error-subtle hover:text-error active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        <Bookmark className="h-5 w-5 fill-current" aria-hidden />
      </button>
    </div>
  );
}

export default function MyPage() {
  const eligHydrated = useHydrated(useEligibilityStore);
  const prefHydrated = useHydrated(usePreferencesStore);
  const userHydrated = useHydrated(useUserStore);
  const savedResults = useEligibilityStore((s) => s.savedResults);
  const resetElig = useEligibilityStore((s) => s.reset);
  const pref = usePreferencesStore();
  const resetPref = usePreferencesStore((s) => s.reset);
  const user = useUserStore();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!eligHydrated || !prefHydrated || !userHydrated) {
    return (
      <PageContainer className="py-10">
        <LoadingState />
      </PageContainer>
    );
  }

  const savedOpen = user.savedHousingIds.filter((id) => housingById(id)?.recruitStatus === "open");
  const axes: string[] = [];
  if (pref.frequent.length) axes.push("자주 가는 장소");
  if (pref.infraCategories.length) axes.push("기반시설");
  if (pref.eduEnabled) axes.push("돌봄·교육");
  if (pref.storeChips.length) axes.push("취향 가게");
  if (pref.moodTarget !== null) axes.push("동네 분위기");

  return (
    <PageContainer size="wide" className="py-8">
      <div className="mb-6 flex items-center gap-4">
        <Mascot pose="present" float className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" sizes="96px" />
        <div className="flex-1">
          <SectionHeader as="h1" eyebrow="마이페이지" title="내 진단·추천 관리" />
        </div>
      </div>

      {/* 데스크톱·태블릿 2열(6:4), 모바일 1열. 순서는 DOM 순서 그대로다. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* 1행 왼쪽 */}
        <Tile
          title="공공임대 내 자격 확인"
          icon={<ClipboardCheck className="h-5 w-5" />}
          action={
            <Link href="/eligibility" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}>
              {savedResults && savedResults.length > 0 ? <Pencil className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
              {savedResults && savedResults.length > 0 ? "수정" : "자격 확인 시작"}
            </Link>
          }
        >
          {savedResults && savedResults.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {savedResults.map((r) => (
                <li key={r.type} className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-border p-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{ELIGIBILITY_TYPE_LABEL[r.type]}</span>
                    {r.baseYear === 2025 && <Badge tone="warning">2025</Badge>}
                  </span>
                  <StatusBadge status={r.evaluation.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              아직 진단 결과가 없어요.{" "}
              <Link href="/eligibility" className="font-semibold text-primary underline">1단계 자격 확인</Link>을 먼저 해보세요.
            </p>
          )}
        </Tile>

        {/* 1행 오른쪽 */}
        <Tile title="최근 본 주택" icon={<Clock className="h-5 w-5" />}>
          {user.recentHousingIds.length ? (
            <div className="space-y-2">
              {user.recentHousingIds.slice(0, 4).map((id) => (
                <HousingMini key={id} id={id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">최근 본 주택이 없어요.</p>
          )}
        </Tile>

        {/* 2행 왼쪽 */}
        <Tile
          title="생활 취향 설정"
          icon={<UserCircle2 className="h-5 w-5" />}
          action={
            <Link href={savedResults?.length ? "/preferences" : "/eligibility"} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}>
              {isBudgetComplete(pref) ? <Pencil className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
              {isBudgetComplete(pref) ? "수정" : "취향 설정 시작"}
            </Link>
          }
        >
          {isBudgetComplete(pref) ? (
            <ul className="space-y-1.5 text-sm text-muted">
              <li>예산: 보증금 {formatManwon(pref.maxDeposit ?? 0)} / 월 {formatManwon(pref.maxMonthlyRent ?? 0)} 이하</li>
              <li>지역: {pref.anyRegion || pref.gungus.length === 0 ? "전체" : pref.gungus.join(", ")}</li>
              <li>반영 항목: {axes.length ? axes.join(", ") : "없음"}</li>
            </ul>
          ) : (
            <p className="text-sm text-muted">취향 설문을 완료하면 설정이 표시돼요.</p>
          )}
        </Tile>

        {/* 2행 오른쪽 — 저장한 주택 중 모집 중인 공고 (별도 저장소 없이 파생) */}
        <Tile title={`관심 모집공고 (${savedOpen.length})`} icon={<Bell className="h-5 w-5" />}>
          {savedOpen.length ? (
            <div className="space-y-2">
              {savedOpen.map((id) => (
                <HousingMini key={id} id={id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">저장한 주택 중 모집 중인 공고가 없어요.</p>
          )}
        </Tile>
      </div>

      {/* 저장한 주택 — 오른쪽 북마크로 개별 해제 */}
      <Tile title={`저장한 주택 (${user.savedHousingIds.length})`} icon={<Bookmark className="h-5 w-5" />} className="mt-4">
        {user.savedHousingIds.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {user.savedHousingIds.map((id) => (
              <HousingMini key={id} id={id} onUnsave={user.toggleSaved} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Mascot pose="idle" className="h-16 w-16 shrink-0" sizes="64px" />
            <p className="text-sm text-muted">아직 저장한 주택이 없어요. 추천 목록에서 저장해 보세요.</p>
          </div>
        )}
      </Tile>

      {/* 데이터 삭제 — 카드가 아닌 단독 위험 버튼 */}
      <div className="mt-8 border-t border-border pt-6">
        <p className="mb-3 text-sm text-muted">아래 작업은 이 브라우저에 저장된 진단·추천·관심 주택 정보를 모두 지웁니다.</p>
        <Button variant="danger" size="md" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" /> 내 데이터 삭제
        </Button>
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          user.clearAll();
          resetElig();
          resetPref();
        }}
        title="모든 데이터를 삭제할까요?"
        description="진단 결과·추천 설정·저장한 주택이 이 브라우저에서 영구 삭제돼요. 되돌릴 수 없어요."
        confirmLabel="삭제하기"
        danger
      />
    </PageContainer>
  );
}
