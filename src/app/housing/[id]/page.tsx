"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  ExternalLink,
  MessageCircleQuestion,
  MapPin,
  MapPinned,
  Share2,
  Star,
} from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { Disclaimer, InformationBanner } from "@/components/common/banners";
import { EmptyState } from "@/components/common/states";
import { Mascot } from "@/components/common/Mascot";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ScoreBreakdown } from "@/components/housing/ScoreBreakdown";
import { MapPanel } from "@/components/map/MapPanel";
import { bestCondition, housingById, type HousingMetric } from "@/mocks/housing";
import { reviewsByHousing } from "@/mocks/reviews";
import { useUserStore } from "@/features/user/user.store";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { usePreferencesStore, buildSurvey, isBudgetComplete } from "@/features/recommendation/preferences.store";
import { useHydrated } from "@/lib/use-hydrated";
import { recommend, matchLevel } from "@/features/recommendation/recommendation.service";
import { ApplicationChecklist } from "@/components/housing/ApplicationChecklist";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { formatManwon, formatDistance } from "@/lib/formatting";
import { cn } from "@/lib/utils";

const NEARBY = [
  { key: "subway" as const, label: "지하철역" },
  { key: "mart" as const, label: "대형마트" },
  { key: "hospital" as const, label: "종합병원(차량)" },
  { key: "park" as const, label: "공원" },
];

const STATUS = {
  open: { tone: "success" as const, label: "모집 중" },
  upcoming: { tone: "primary" as const, label: "모집 예정" },
  closed: { tone: "neutral" as const, label: "마감" },
  unknown: { tone: "neutral" as const, label: "공고 확인 필요" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-bold text-navy">{title}</h2>
      {children}
    </section>
  );
}

function DataMetricTable({
  title,
  items,
}: {
  title: string;
  items: [string, HousingMetric | null][];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-navy">{title}</h3>
      <div className="overflow-x-auto rounded-[var(--radius-input)] border border-border">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead className="bg-surface-muted text-xs text-muted">
            <tr>
              <th className="px-3 py-2">시설</th>
              <th className="px-3 py-2">거리</th>
            </tr>
          </thead>
          <tbody>
            {items.map(([label, value]) => (
              <tr key={label} className="border-t border-border/70">
                <td className="px-3 py-2 font-medium">{label}</td>
                <td className="px-3 py-2 tabular-nums">{value ? formatDistance(value.distance) : "정보 없음"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 백분위(0~1)를 사용자가 이해할 수 있는 말로 바꿔준다. */
function bustleLabel(percentile: number): string {
  if (percentile >= 0.75) return "매우 번화해요";
  if (percentile >= 0.5) return "적당히 번화해요";
  if (percentile >= 0.25) return "한적한 편이에요";
  return "매우 조용해요";
}

function quietLabel(noisePercentile: number): string {
  if (noisePercentile >= 0.75) return "번잡할 수 있어요";
  if (noisePercentile >= 0.5) return "보통이에요";
  if (noisePercentile >= 0.25) return "조용한 편이에요";
  return "매우 조용해요";
}

function MetricTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums text-fg">{value}</dd>
    </div>
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
  const representative = bestCondition(unit);
  const sourceHead = unit.source.sourceRows[0];
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

      {/* 주택 요약 */}
      <header className="rounded-[var(--radius-cardlg)] border border-primary/15 bg-primary-subtle/55 p-5 shadow-[var(--shadow-sm)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <Mascot pose="housePin" className="hidden h-24 w-24 shrink-0 sm:block" sizes="96px" />
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
          <p className="mt-4 text-sm text-muted">
            대표 조건
            <span className="ml-2 font-bold tabular-nums text-navy">
              {representative
                ? `보증금 ${formatManwon(representative.deposit)} · 월 ${formatManwon(representative.monthlyRent)}`
                : "임대조건 미공개"}
            </span>
          </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={unit.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "primary", size: "md" }))}
          >
            공식 공고 확인 <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <Link
            href={`/chat?housingId=${unit.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "md" }))}
          >
            <MessageCircleQuestion className="h-4 w-4" aria-hidden />
            AI 갈붕이에게 물어보기
          </Link>
          <Link
            href={`/map?selected=${unit.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "md" }))}
          >
            <MapPinned className="h-4 w-4" aria-hidden />
            갈붕 지도에서 보기
          </Link>
          <Button variant="outline" size="md" onClick={share}>
            <Share2 className="h-4 w-4" /> {copied ? "링크 복사됨" : "공유"}
          </Button>
          <Button variant={saved ? "primary" : "outline"} size="md" onClick={() => toggleSaved(unit.id)} aria-pressed={saved}>
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} /> {saved ? "저장됨" : "저장"}
          </Button>
        </div>
      </div>
      </header>

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
              <CardBody>
                {unit.source.sourceRows.length > 0 ? (
                  <div className="max-h-[420px] overflow-auto rounded-[var(--radius-input)] border border-border">
                    <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-surface-muted text-xs text-muted">
                        <tr>
                          <th className="px-3 py-2 font-semibold">호실</th>
                          <th className="px-3 py-2 font-semibold">전용면적</th>
                          <th className="px-3 py-2 font-semibold">방</th>
                          <th className="px-3 py-2 font-semibold">공급 구분</th>
                          <th className="px-3 py-2 font-semibold">소득 구간</th>
                          <th className="px-3 py-2 font-semibold">가구원</th>
                          <th className="px-3 py-2 font-semibold">보호 유형</th>
                          <th className="px-3 py-2 font-semibold">순위</th>
                          <th className="px-3 py-2 font-semibold">보증금</th>
                          <th className="px-3 py-2 font-semibold">월 임대료</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unit.source.sourceRows.map((row, index) => (
                          <tr key={`${row.unit_no ?? "unit"}-${index}`} className="border-t border-border/70">
                            <td className="px-3 py-2">{row.unit_no ?? "미상"}</td>
                            <td className="px-3 py-2 tabular-nums">
                              {row.area_exclusive_m2 === null ? "미공개" : `${row.area_exclusive_m2}㎡`}
                            </td>
                            <td className="px-3 py-2">
                              {row.room_count === null ? "미공개" : `${row.room_count}개`}
                            </td>
                            <td className="px-3 py-2">{row.supply_class ?? "미공개"}</td>
                            <td className="px-3 py-2">{row.income_bracket ?? "미공개"}</td>
                            <td className="px-3 py-2">{row.household_size ?? "미공개"}</td>
                            <td className="px-3 py-2">{row.protection_type ?? "미공개"}</td>
                            <td className="px-3 py-2">{row.priority_rank === null ? "미공개" : `${row.priority_rank}순위`}</td>
                            <td className="px-3 py-2 font-semibold tabular-nums">
                              {row.deposit_krw === null ? "미공개" : formatManwon(row.deposit_krw / 10_000)}
                            </td>
                            <td className="px-3 py-2 font-semibold tabular-nums">
                              {row.rent_krw === null ? "미공개" : formatManwon(row.rent_krw / 10_000)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <InformationBanner tone="warning">
                    임대조건 정보가 없는 건물이에요. 공식 공고에서 보증금과 월 임대료를 확인해 주세요.
                  </InformationBanner>
                )}
                <p className="pt-3 text-xs text-muted">
                  <Building2 className="mr-1 inline h-3.5 w-3.5" aria-hidden /> 총 {unit.source.sourceRowCount}호실 ·
                  가격 공개 {unit.source.pricedUnitCount}호실 · 전용 {unit.exclusiveAreas.join(", ")}㎡
                </p>
              </CardBody>
            </Card>
          </Section>

          <Section title="주택 상세 정보">
            <Card>
              <CardBody>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  {[
                    ["주택 유형", unit.source.houseType ?? "미공개"],
                    ["임대 구분", sourceHead.rental_type ?? "미공개"],
                    ["건물 형태", unit.source.buildingForm ?? "미공개"],
                    ["준공연도", unit.source.completionYear ? `${unit.source.completionYear}년` : "미공개"],
                    ["세대 수", sourceHead.household_count === null ? "미공개" : `${sourceHead.household_count}세대`],
                    ["호실 수", sourceHead.unit_count === null ? "미공개" : `${sourceHead.unit_count}호`],
                    ["엘리베이터", unit.source.elevator ?? "미공개"],
                    ["주차", unit.source.parkingCount === null ? "미공개" : `${unit.source.parkingCount}면`],
                    ["난방 방식", unit.source.heatingType ?? "미공개"],
                    ["입주자격 요약", unit.source.eligibilitySummary ?? "미공개"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[var(--radius-input)] bg-surface-muted/70 p-3">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="mt-1 font-semibold text-fg">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </Section>

          <Section title="주변 생활 환경">
            <Card>
              <CardBody className="space-y-6">
                <DataMetricTable
                  title="필수 인프라"
                  items={[
                    ["병원", unit.source.infra.hospital],
                    ["도서관", unit.source.infra.library],
                    ["대형마트", unit.source.infra.mart],
                    ["공원", unit.source.infra.park],
                    ["생활체육시설", unit.source.infra.sports],
                    ["지하철역", unit.source.infra.subway],
                  ]}
                />
                <DataMetricTable
                  title="돌봄·교육"
                  items={[
                    ["어린이집", unit.source.education.daycare],
                    ["유치원", unit.source.education.kindergarten],
                    ["초등학교", unit.source.education.elementary],
                    ["중학교", unit.source.education.middle],
                    ["고등학교", unit.source.education.high],
                  ]}
                />
                <div>
                  <h3 className="mb-2 text-sm font-bold text-navy">걸어서 갈 수 있는 가게 (반경 750m)</h3>
                  <div className="overflow-x-auto rounded-[var(--radius-input)] border border-border">
                    <table className="w-full min-w-[280px] text-left text-sm">
                      <thead className="bg-surface-muted text-xs text-muted">
                        <tr>
                          <th className="px-3 py-2">업종</th>
                          <th className="px-3 py-2">점포 수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(unit.source.stores)
                          .filter(([, value]) => value && value.count > 0)
                          .map(([label, value]) => (
                            <tr key={label} className="border-t border-border/70">
                              <td className="px-3 py-2 font-medium">{label}</td>
                              <td className="px-3 py-2 tabular-nums">{value!.count}곳</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {unit.source.neighborhood && (
                  <div className="rounded-[var(--radius-input)] bg-surface-muted/70 p-4 text-sm">
                    <h3 className="font-bold text-navy">동네 분위기</h3>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                      <MetricTerm label="주변 상가" value={`${unit.source.neighborhood.storeTotal}곳`} />
                      <MetricTerm
                        label="번화한 정도"
                        value={bustleLabel(unit.source.neighborhood.bustlePercentile)}
                      />
                      <MetricTerm label="조용한 정도" value={quietLabel(unit.source.neighborhood.noisePercentile)} />
                    </dl>
                  </div>
                )}
              </CardBody>
            </Card>
          </Section>

          {/* 4) 모집 및 신청 일정 */}
          <Section title="모집 및 신청 일정">
            <InformationBanner tone="warning" title="모집 일정은 포함되어 있지 않아요">
              현재 주택·임대조건 정보이며 실시간 모집공고가 아니에요. 신청 기간과 모집 상태는 공식 기관에서 확인하세요.
            </InformationBanner>
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

        </div>

        {/* 사이드: 지도 + 주변시설 + 공고 */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="h-72 sm:h-80">
            <MapPanel
              markers={[{ id: unit.id, coord: unit.coord, label: unit.name }]}
              selectedId={unit.id}
              onSelect={() => {}}
              ariaLabel={`${unit.name} 위치 지도`}
            />
          </div>
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-bold text-navy">주변시설 · 예상 정보</h2>
              <ul className="space-y-2 text-sm">
                {NEARBY.map((nearby) => (
                  <li key={nearby.key} className="flex items-center justify-between">
                    <span className="text-muted">{nearby.label}</span>
                    <span className="font-medium text-fg">
                      {unit.source.infra[nearby.key]
                        ? formatDistance(unit.source.infra[nearby.key]!.distance)
                        : "데이터 없음"}
                    </span>
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

      <Section title={`이용 후기 (${reviews.length})`}>
        <InformationBanner tone="warning" className="mb-3">
          아래 후기는 서비스 화면 예시예요.
        </InformationBanner>
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.length === 0 && <p className="text-sm text-muted">등록된 후기가 없어요.</p>}
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

      <Disclaimer className="mt-10" />
    </PageContainer>
  );
}
