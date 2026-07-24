"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  ClipboardCheck,
  Clock,
  LogOut,
  Pencil,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { InformationBanner } from "@/components/common/banners";
import { LoadingState } from "@/components/common/states";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy">
            <span className="text-primary">{icon}</span> {title}
          </h2>
          {action}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

function HousingMini({ id }: { id: string }) {
  const u = housingById(id);
  if (!u) return null;
  const best = bestCondition(u);
  return (
    <Link href={`/housing/${u.id}`} className="flex items-center justify-between rounded-[var(--radius-input)] border border-border p-3 hover:bg-surface-muted">
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{u.name}</span>
        <span className="block text-sm text-muted">{u.gungu} · 보증금 {formatManwon(best.deposit)} · 월 {formatManwon(best.monthlyRent)}</span>
      </span>
      <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[u.type]}</Badge>
    </Link>
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
  if (pref.storeChips.length + pref.storeCustom.length) axes.push("취향 가게");
  if (pref.mood) axes.push("동네 분위기");

  return (
    <PageContainer size="wide" className="py-8">
      <SectionHeader as="h1" eyebrow="마이페이지" title="내 진단·추천 관리" />

      <InformationBanner tone="primary" className="mb-6" title="비로그인(게스트) 모드">
        입력·저장 정보는 이 브라우저에만 보관돼요. 다른 기기와 동기화되지 않으며, 아래에서 언제든 삭제할 수 있어요.
      </InformationBanner>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 자격 결과 */}
        <Tile
          title="내 자격 결과"
          icon={<ClipboardCheck className="h-5 w-5" />}
          className="md:col-span-2"
          action={
            <Link href="/eligibility" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              {savedResults && savedResults.length > 0 ? <Pencil className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
              {savedResults && savedResults.length > 0 ? "수정" : "자격 확인 시작"}
            </Link>
          }
        >
          {savedResults && savedResults.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {savedResults.map((r) => (
                <li key={r.type} className="flex items-center justify-between rounded-[var(--radius-input)] border border-border p-3">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {ELIGIBILITY_TYPE_LABEL[r.type]}
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

        {/* 추천 설정 */}
        <Tile
          title="추천 설정"
          icon={<UserCircle2 className="h-5 w-5" />}
          action={
            <Link href={savedResults?.length ? "/preferences" : "/eligibility"} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
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

        {/* 저장 주택 */}
        <Tile title={`저장한 주택 (${user.savedHousingIds.length})`} icon={<Bookmark className="h-5 w-5" />} className="md:col-span-2">
          {user.savedHousingIds.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {user.savedHousingIds.map((id) => (
                <HousingMini key={id} id={id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">아직 저장한 주택이 없어요. 추천 목록에서 저장해 보세요.</p>
          )}
        </Tile>

        {/* 최근 본 주택 */}
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

        {/* 관심 모집공고 */}
        <Tile title="관심 모집공고 (모집 중)" icon={<Bell className="h-5 w-5" />}>
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

        {/* 알림 설정 */}
        <Tile title="알림 설정" icon={<Bell className="h-5 w-5" />}>
          <ul className="space-y-3">
            <li className="flex items-center justify-between">
              <span className="text-sm text-fg">관심 공고 모집 시작 알림</span>
              <Toggle checked={user.notifications.recruitOpen} onChange={(v) => user.setNotification("recruitOpen", v)} label="관심 공고 모집 시작 알림" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sm text-fg">저장 주택 정보 변경 알림</span>
              <Toggle checked={user.notifications.savedUpdate} onChange={(v) => user.setNotification("savedUpdate", v)} label="저장 주택 정보 변경 알림" />
            </li>
          </ul>
        </Tile>

        {/* 계정/데이터 */}
        <Tile title="내 데이터 관리" icon={<LogOut className="h-5 w-5" />} className="md:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap gap-2">
            <Link href="/eligibility" className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              <Pencil className="h-4 w-4" /> 1단계 다시 하기
            </Link>
            <Link href="/preferences" className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              <Pencil className="h-4 w-4" /> 2단계 다시 하기
            </Link>
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-3 text-sm text-muted">아래 작업은 이 브라우저에 저장된 진단·추천·관심 주택 정보를 모두 지웁니다.</p>
            <Button variant="danger" size="md" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> 내 데이터 삭제
            </Button>
          </div>
        </Tile>
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
