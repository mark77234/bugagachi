"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  CalendarDays,
  ExternalLink,
  MapPin,
  Share2,
  Star,
} from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { Disclaimer, InformationBanner } from "@/components/common/banners";
import { EmptyState } from "@/components/common/states";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ScoreBreakdown } from "@/components/housing/ScoreBreakdown";
import { MapPanel } from "@/components/map/MapPanel";
import { housingById } from "@/mocks/housing";
import { reviewsByHousing } from "@/mocks/reviews";
import { useUserStore } from "@/features/user/user.store";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { usePreferencesStore, buildSurvey, isBudgetComplete } from "@/features/recommendation/preferences.store";
import { useHydrated } from "@/lib/use-hydrated";
import { recommend, matchLevel } from "@/features/recommendation/recommendation.service";
import { ApplicationChecklist } from "@/components/housing/ApplicationChecklist";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { formatManwon, formatDistance } from "@/lib/formatting";
import { nearestInfraMeters } from "@/mocks/facilities";
import type { InfraCategory } from "@/features/recommendation/recommendation.types";
import { cn } from "@/lib/utils";

const NEARBY: { cat: InfraCategory; label: string }[] = [
  { cat: "SUBWAY", label: "지하철역" },
  { cat: "MART", label: "대형마트" },
  { cat: "HOSPITAL", label: "종합병원(차량)" },
  { cat: "PARK", label: "공원" },
];

const STATUS = {
  open: { tone: "success" as const, label: "모집 중" },
  upcoming: { tone: "primary" as const, label: "모집 예정" },
  closed: { tone: "neutral" as const, label: "마감" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-bold text-navy">{title}</h2>
      {children}
    </section>
  );
}

export default function HousingDetailPage() {
  const params = useParams<{ id: string }>();
  const unit = housingById(params.id);
  const addRecent = useUserStore((s) => s.addRecent);
  const saved = useUserStore((s) => (unit ? s.savedHousingIds.includes(unit.id) : false));
  const toggleSaved = useUserStore((s) => s.toggleSaved);
  const eligHydrated = useHydrated(useEligibilityStore);
  const savedResults = useEligibilityStore((s) => s.savedResults);
  const pref = usePreferencesStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (unit) addRecent(unit.id);
  }, [unit, addRecent]);

  const rec = useMemo(() => {
    if (!unit) return null;
    const passed = (savedResults ?? []).filter((r) => r.evaluation.status === "PASS").map((r) => r.type);
    if (passed.length === 0 || !isBudgetComplete(pref)) return null;
    const outcome = recommend(passed, buildSurvey(pref));
    if (outcome.kind !== "ok") return null;
    return outcome.recommendations.find((r) => r.unitId === unit.id) ?? null;
  }, [unit, savedResults, pref]);

  if (!unit) {
    return (
      <PageContainer size="narrow" className="py-12">
        <EmptyState title="주택을 찾을 수 없어요" description="목록에서 다시 선택해 주세요." action={<Link href="/recommendations" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>목록으로</Link>} />
      </PageContainer>
    );
  }

  const st = STATUS[unit.recruitStatus];
  const match = rec ? matchLevel(rec) : null;
  const reviews = reviewsByHousing(unit.id);
  const myElig = eligHydrated ? (savedResults ?? []).find((r) => r.type === unit.type) : undefined;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <PageContainer size="default" className="py-6">
      <Link href="/recommendations" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> 추천 목록으로
      </Link>

      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[unit.type]}</Badge>
            <Badge tone={st.tone}>{st.label}</Badge>
            {unit.type === "JAEGAEBAL" && <Badge tone="warning">2025년 기준</Badge>}
            {match && <Badge tone={match.tone}>적합도 · {match.label}</Badge>}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{unit.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-muted">
            <MapPin className="h-4 w-4" aria-hidden /> {unit.address}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={share}>
            <Share2 className="h-4 w-4" /> {copied ? "링크 복사됨" : "공유"}
          </Button>
          <Button variant={saved ? "primary" : "outline"} size="md" onClick={() => toggleSaved(unit.id)} aria-pressed={saved}>
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} /> {saved ? "저장됨" : "저장"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {/* 1) 나에게 추천된 이유 + 항목별 점수 (차별점: 왜 추천되었는지) */}
          <Section title="나에게 추천된 이유">
            <Card>
              <CardBody className="space-y-4">
                {rec ? (
                  <>
                    {match && (
                      <div className="flex items-center gap-2">
                        <Badge tone={match.tone}>적합도 · {match.label}</Badge>
                        <span className="text-sm text-muted">아래 근거로 순위를 매겼어요.</span>
                      </div>
                    )}
                    <ul className="space-y-1.5 text-sm">
                      {rec.reasons.filter((r) => r.axis !== "eligibility").map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="text-fg">{r.text} <span className="text-muted">{r.rawValue}</span></span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-border pt-4">
                      <ScoreBreakdown byAxis={rec.score.byAxis} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted">
                      <Link href="/preferences" className="font-semibold text-primary underline">2단계 취향 설문</Link>을 완료하면 나에게 맞는 이유와 항목별 점수가 표시돼요.
                    </p>
                    <ScoreBreakdown byAxis={[]} />
                  </div>
                )}
              </CardBody>
            </Card>
          </Section>

          {/* 2) 신청 자격 요약 (판정 병렬 표시 — 취향 점수와 혼합하지 않음) */}
          <Section title="신청 자격">
            <Card>
              <CardBody className="space-y-3">
                {myElig ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">내 1단계 판정 ({ELIGIBILITY_TYPE_LABEL[unit.type]})</span>
                      <StatusBadge status={myElig.evaluation.status} />
                    </div>
                    {myElig.evaluation.checkLater.length > 0 && (
                      <ul className="space-y-1 text-sm text-muted">
                        {myElig.evaluation.checkLater.map((c, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-warning" aria-hidden>•</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    <Link href="/eligibility" className="font-semibold text-primary underline">1단계 자격 확인</Link>을 완료하면 이 유형의 판정 결과가 함께 표시돼요.
                  </p>
                )}
                <InformationBanner tone="warning">
                  자격 판정은 참고용이에요. 실제 신청 가능 여부는 공식 모집공고로 확정됩니다.
                </InformationBanner>
              </CardBody>
            </Card>
          </Section>

          {/* 3) 비용 */}
          <Section title="비용 (보증금·임대료)">
            <Card>
              <CardBody className="space-y-2">
                {unit.conditions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/70 pb-2 last:border-0 last:pb-0">
                    <span className="text-sm text-muted">{c.priorityRank ? `${c.priorityRank}순위` : "기본"}</span>
                    <span className="text-sm">
                      보증금 <b>{formatManwon(c.deposit)}</b> · 월 <b>{formatManwon(c.monthlyRent)}</b>
                    </span>
                  </div>
                ))}
                <p className="pt-1 text-xs text-muted">
                  <Building2 className="mr-1 inline h-3.5 w-3.5" aria-hidden /> 공급 {unit.supplyCount}세대 · 전용 {unit.exclusiveAreas.join(", ")}㎡
                </p>
              </CardBody>
            </Card>
          </Section>

          {/* 4) 모집 및 신청 일정 */}
          <Section title="모집 및 신청 일정">
            <Card>
              <CardBody className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
                {unit.recruitPeriod ? (
                  <span>
                    신청 기간 <b>{unit.recruitPeriod.start}</b> ~ <b>{unit.recruitPeriod.end}</b>
                  </span>
                ) : (
                  <span className="text-muted">일정 미정</span>
                )}
              </CardBody>
            </Card>
          </Section>

          {/* 5) 신청 준비 체크리스트 (차별점: 신청 준비까지 연결) */}
          <Section title="신청 준비 체크리스트">
            <Card>
              <CardBody>
                <p className="mb-4 text-sm text-muted">신청 전에 준비할 항목이에요. 체크하면 이 브라우저에 저장돼요.</p>
                <ApplicationChecklist housingId={unit.id} type={unit.type} />
              </CardBody>
            </Card>
          </Section>

          {/* 6) 리뷰 */}
          <Section title={`사용자 리뷰 (${reviews.length})`}>
            <div className="space-y-3">
              {reviews.length === 0 && <p className="text-sm text-muted">아직 리뷰가 없어요.</p>}
              {reviews.map((rv) => (
                <Card key={rv.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Star className="h-4 w-4 fill-warning text-warning" aria-hidden /> {rv.rating.toFixed(1)}
                        <span className="ml-2 text-muted">{rv.author}</span>
                      </span>
                      <span className="text-xs text-muted">{rv.createdAt}</span>
                    </div>
                    <p className="text-sm text-fg">{rv.body}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rv.tags.map((t) => (
                        <Badge key={t} tone="neutral">#{t}</Badge>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </Section>
        </div>

        {/* 사이드: 지도 + 주변시설 + 공고 */}
        <aside className="space-y-4">
          <div className="h-72 sm:h-80">
            <MapPanel markers={[{ id: unit.id, coord: unit.coord, label: unit.name }]} selectedId={unit.id} onSelect={() => {}} />
          </div>
          <Card>
            <CardBody>
              <h3 className="mb-3 text-sm font-bold text-navy">주변시설 (예상 거리)</h3>
              <ul className="space-y-2 text-sm">
                {NEARBY.map((n) => (
                  <li key={n.cat} className="flex items-center justify-between">
                    <span className="text-muted">{n.label}</span>
                    <span className="font-medium text-fg">{formatDistance(nearestInfraMeters(unit.coord, n.cat))}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <a
            href={unit.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
          >
            공식 공고 확인 <ExternalLink className="h-4 w-4" />
          </a>
        </aside>
      </div>

      <Disclaimer className="mt-10" />
    </PageContainer>
  );
}
