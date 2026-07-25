"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  CircleAlert,
  ExternalLink,
  ImageOff,
  Landmark,
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
import {
  MissingNote,
  RENTAL_TYPE_TONE,
  SpecItem,
  cleanAddress,
  completionLabel,
  formatArea,
  parkingLabel,
  roomLabel,
} from "@/components/housing/HousingDetailParts";
import { MapPanel } from "@/components/map/MapPanel";
import { NearbyInfraSection } from "@/components/housing/NearbyInfraSection";
import { DetailTabs, type DetailTabKey } from "@/components/housing/DetailTabs";
import { bestCondition, housingById, type HousingMetric, type HousingUnit } from "@/mocks/housing";
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

const STATUS = {
  open: { tone: "success" as const, label: "모집 중" },
  upcoming: { tone: "primary" as const, label: "모집 예정" },
  closed: { tone: "neutral" as const, label: "마감" },
  unknown: { tone: "neutral" as const, label: "공고 확인 필요" },
};

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-6 scroll-mt-24">
      <h2 className="mb-1 text-lg font-bold text-navy">{title}</h2>
      {description && <p className="mb-3 text-sm text-muted">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </section>
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

/** 원본 행에서 값이 있는 것만 모아 중복 없이 돌려준다(유형별 조건부 노출용). */
function distinctValues(unit: HousingUnit, key: string): string[] {
  const values = unit.source.sourceRows
    .map((row) => row[key])
    .filter((value): value is string | number => value !== null && value !== undefined && value !== "")
    .map(String);
  return [...new Set(values)];
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
  const [tab, setTab] = useState<DetailTabKey>("price");

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
        <EmptyState
          title="주택을 찾을 수 없어요"
          description="목록에서 다시 선택해 주세요."
          action={
            <Link href="/recommendations" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>
              목록으로
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const st = STATUS[unit.recruitStatus];
  const representative = bestCondition(unit);
  const sourceHead = unit.source.sourceRows[0];
  const match = rec ? matchLevel(rec) : null;
  const reviews = reviewsByHousing(unit.id);
  const myElig = eligHydrated ? (savedResults ?? []).find((r) => r.type === unit.type) : undefined;
  const address = cleanAddress(unit.address);
  const thisYear = new Date().getFullYear();

  // S0 — 단지명 결측(매입임대 약 16%) 시 도로명주소로 대체
  const displayTitle = sourceHead.complex_name?.trim() || address;

  // S3 — 유형별 조건부 필드는 값이 있을 때만 노출
  const supplyClasses = distinctValues(unit, "supply_class");
  const incomeBrackets = distinctValues(unit, "income_bracket");
  const householdSizes = distinctValues(unit, "household_size");
  const protectionTypes = distinctValues(unit, "protection_type");
  const priorityRanks = distinctValues(unit, "priority_rank");

  // S4 — 주택 사양
  const roomCounts = [
    ...new Set(
      unit.source.sourceRows
        .map((row) => row.room_count)
        .filter((value): value is number => typeof value === "number"),
    ),
  ].sort((a, b) => a - b);
  const unitTypes = distinctValues(unit, "unit_type");
  const unitNos = distinctValues(unit, "unit_no");

  // S2 — 가격 미등록 호실
  const unpricedCount = unit.source.sourceRowCount - unit.source.pricedUnitCount;

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

      {/* S0 — 헤더: 임대유형 배지 · 단지명 · 시군구 · 추천점수 */}
      <header className="rounded-[var(--radius-cardlg)] border border-primary/15 bg-primary-subtle/55 p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <Mascot pose="housePin" className="hidden h-24 w-24 shrink-0 sm:block" sizes="96px" />
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={RENTAL_TYPE_TONE[unit.type]}>{ELIGIBILITY_TYPE_LABEL[unit.type]}</Badge>
                <Badge tone={st.tone}>{st.label}</Badge>
                {unit.type === "JAEGAEBAL" && <Badge tone="warning">2025년 기준</Badge>}
                {match && <Badge tone={match.tone}>추천점수 · {match.label}</Badge>}
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">{displayTitle}</h1>
              <p className="mt-1 flex items-center gap-1 text-muted">
                <MapPin className="h-4 w-4" aria-hidden /> {unit.gungu} · {address}
              </p>
              {rec && (
                <p className="mt-3 text-sm text-muted">
                  2단계 추천점수
                  <span className="ml-2 font-bold tabular-nums text-navy">
                    {Math.round(rec.score.final * 100)}점 / 100점
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={unit.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "primary", size: "md" }))}
            >
              신청하러 가기 <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            <Link href={`/chat?housingId=${unit.id}`} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              <MessageCircleQuestion className="h-4 w-4" aria-hidden />
              AI 갈붕이에게 물어보기
            </Link>
            <Link href={`/map?selected=${unit.id}`} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              <MapPinned className="h-4 w-4" aria-hidden />
              지도에서 보기
            </Link>
            <Button variant="outline" size="md" onClick={share}>
              <Share2 className="h-4 w-4" /> {copied ? "링크 복사됨" : "공유"}
            </Button>
            <Button
              variant={saved ? "primary" : "outline"}
              size="md"
              onClick={() => toggleSaved(unit.id)}
              aria-pressed={saved}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-current")} /> {saved ? "저장됨" : "저장"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {/* 내용이 많아 탭으로 나눠 보여준다. 각 탭은 원래 S1~S8 섹션 묶음이다. */}
          <DetailTabs value={tab} onChange={setTab} />

          {tab === "price" && (
            <>
          {/* S2 — 임대조건 (최우선) */}
          <Section id="s2" title="임대조건">
            <Card>
              <CardBody className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-input)] bg-primary-subtle p-4">
                    <p className="text-xs text-primary">대표 보증금</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-navy">
                      {representative ? formatManwon(representative.deposit) : "가격 미등록"}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-input)] bg-primary-subtle p-4">
                    <p className="text-xs text-primary">대표 월 임대료</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-navy">
                      {representative ? formatManwon(representative.monthlyRent) : "가격 미등록"}
                    </p>
                  </div>
                </div>

                {/* 보증금 마련 수단 안내 — 외부 대출 비교 서비스로 연결한다. */}
                <a
                  href="https://www.allcredit.co.kr/screen/sc8846733730"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-[var(--radius-input)] border border-primary/25 bg-primary-subtle/60 p-3.5 transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                    <Landmark className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-navy">보증금이 부담되나요? 전세자금대출 알아보기</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      올크레딧에서 조건에 맞는 대출 상품을 비교해 볼 수 있어요. (외부 사이트)
                    </span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                </a>

                {unpricedCount > 0 && (
                  <InformationBanner tone="warning">
                    이 건물의 {unpricedCount}호실은 원자료에 임대조건이 없어 <b>가격 미등록</b>이에요. 보증금·월 임대료는
                    공식 공고에서 확인해 주세요.
                  </InformationBanner>
                )}

                {unit.source.sourceRows.length > 0 ? (
                  <div className="max-h-[420px] overflow-auto rounded-[var(--radius-input)] border border-border">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-surface-muted text-xs text-muted">
                        <tr>
                          <th className="px-3 py-2 font-semibold">호명</th>
                          <th className="px-3 py-2 font-semibold">전용면적</th>
                          <th className="px-3 py-2 font-semibold">방</th>
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
                              {row.area_exclusive_m2 === null ? "미공개" : formatArea(row.area_exclusive_m2)}
                            </td>
                            <td className="px-3 py-2">
                              {row.room_count === null ? "미공개" : roomLabel(row.room_count)}
                            </td>
                            <td className="px-3 py-2">
                              {row.priority_rank === null ? "—" : `${row.priority_rank}순위`}
                            </td>
                            <td className="px-3 py-2 font-semibold tabular-nums">
                              {row.deposit_krw === null ? "가격 미등록" : formatManwon(row.deposit_krw / 10_000)}
                            </td>
                            <td className="px-3 py-2 font-semibold tabular-nums">
                              {row.rent_krw === null ? "가격 미등록" : formatManwon(row.rent_krw / 10_000)}
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

                <p className="flex items-start gap-2 text-xs text-muted">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  가격 기준일(가격등록일)은 현재 데이터셋에 없어요. 유형·건물마다 갱신 시점 편차가 크므로 신청 전 공고
                  금액을 반드시 확인해 주세요.
                </p>
              </CardBody>
            </Card>
          </Section>
            </>
          )}

          {tab === "eligibility" && (
            <>
          {/* S3 — 입주자격 (공통 + 유형별 조건부) */}
          <Section id="s3" title="입주자격">
            <Card>
              <CardBody className="space-y-4">
                <div className="rounded-[var(--radius-input)] bg-surface-muted/70 p-4">
                  <p className="text-xs text-muted">자격 요약</p>
                  <p className="mt-1 font-semibold text-fg">{unit.source.eligibilitySummary ?? "미공개"}</p>
                </div>

                {(supplyClasses.length > 0 ||
                  incomeBrackets.length > 0 ||
                  householdSizes.length > 0 ||
                  protectionTypes.length > 0 ||
                  priorityRanks.length > 0) && (
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {unit.type === "HAENGBOK" && (
                      <SpecItem label="공급계층" value={supplyClasses.join(", ") || null} />
                    )}
                    {unit.type === "TONGHAP" && (
                      <>
                        <SpecItem label="소득구간" value={incomeBrackets.join(", ") || null} />
                        <SpecItem label="가구원 수" value={householdSizes.join(", ") || null} />
                      </>
                    )}
                    {unit.type === "JAEGAEBAL" && (
                      <SpecItem label="보호구분" value={protectionTypes.join(", ") || null} />
                    )}
                    {(unit.type === "MAEIP_ILBAN" || unit.type === "MAEIP_CHUNG") && (
                      <SpecItem
                        label="신청순위"
                        value={priorityRanks.length > 0 ? priorityRanks.map((r) => `${r}순위`).join(" · ") : null}
                      />
                    )}
                  </dl>
                )}

                {unit.type === "TONGHAP" && incomeBrackets.length > 1 && (
                  <InformationBanner tone="primary">
                    통합공공임대는 소득구간 × 가구원 수 조합마다 임대료가 달라져요. 위 임대조건 표에서 내 조건에 해당하는
                    행의 금액을 확인해 주세요.
                  </InformationBanner>
                )}

                {myElig ? (
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted">
                      내 1단계 판정 ({ELIGIBILITY_TYPE_LABEL[unit.type]})
                    </span>
                    <StatusBadge status={myElig.evaluation.status} />
                  </div>
                ) : (
                  <p className="border-t border-border pt-4 text-sm text-muted">
                    <Link href="/eligibility" className="font-semibold text-primary underline">
                      1단계 자격 확인
                    </Link>
                    을 완료하면 이 유형의 판정 결과가 함께 표시돼요.
                  </p>
                )}
                {myElig && myElig.evaluation.checkLater.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted">
                    {myElig.evaluation.checkLater.map((c, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-warning" aria-hidden>
                          •
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-border pt-4">
                  <h3 className="mb-1 text-sm font-bold text-navy">신청 서류 체크리스트</h3>
                  <p className="mb-3 text-sm text-muted">체크 상태는 이 브라우저에 저장돼요.</p>
                  <ApplicationChecklist housingId={unit.id} type={unit.type} />
                </div>

                <InformationBanner tone="warning">
                  자격 판정은 참고용이에요. 실제 신청 가능 여부는 공식 모집공고로 확정됩니다.
                </InformationBanner>
              </CardBody>
            </Card>
          </Section>
            </>
          )}

          {tab === "house" && (
            <>
          {/* S1 — 주택 이미지 (외부 사진·내부 설계도 미보유 → 지도 폴백) */}
          <Section id="s1" title="주택 이미지">
            <Card>
              <CardBody className="space-y-3">
                <div className="h-56 overflow-hidden rounded-[var(--radius-input)] sm:h-72">
                  <MapPanel
                    markers={[{ id: unit.id, coord: unit.coord, label: displayTitle }]}
                    selectedId={unit.id}
                    onSelect={() => {}}
                    ariaLabel={`${displayTitle} 위치 지도 (사진 대체 이미지)`}
                  />
                </div>
                <p className="flex items-start gap-2 text-sm text-muted">
                  <ImageOff className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  외부 촬영 사진과 내부 설계도는 아직 수집하지 않은 항목이라, 위치 지도로 대체해 보여드려요.
                </p>
              </CardBody>
            </Card>
          </Section>

          {/* S4 — 주택 사양 */}
          <Section id="s4" title="주택 사양">
            <Card>
              <CardBody>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <SpecItem
                    label="전용면적"
                    value={
                      unit.exclusiveAreas.length > 0 ? unit.exclusiveAreas.map(formatArea).join(" · ") : null
                    }
                  />
                  <SpecItem
                    label="방 개수"
                    value={roomCounts.length > 0 ? roomCounts.map(roomLabel).join(" · ") : null}
                  />
                  <SpecItem label="주택형" value={unitTypes.join(", ") || null} />
                  <SpecItem
                    label="호명"
                    value={unitNos.length > 0 ? `${unitNos.slice(0, 8).join(", ")}${unitNos.length > 8 ? " 외" : ""}` : null}
                  />
                </dl>
                <MissingNote>
                  공용면적은 이 유형의 원자료에 없어 표시하지 않아요.
                </MissingNote>
              </CardBody>
            </Card>
          </Section>

          {/* S5 — 건물 정보 */}
          <Section id="s5" title="건물 정보">
            <Card>
              <CardBody>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <SpecItem label="주택유형" value={unit.source.houseType} />
                  <SpecItem
                    label="준공"
                    value={
                      unit.source.completionYear ? completionLabel(unit.source.completionYear, thisYear) : null
                    }
                  />
                  <SpecItem label="승강기" value={unit.source.elevator} />
                  <SpecItem label="주차" value={parkingLabel(unit.source.parkingCount)} />
                </dl>
                <p className="mt-3 text-xs text-muted">
                  <Building2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />총 {unit.source.sourceRowCount}호실 · 가격
                  공개 {unit.source.pricedUnitCount}호실
                </p>
              </CardBody>
            </Card>
          </Section>
            </>
          )}

          {tab === "area" && (
            <>
          {/* S6 — 위치·주변환경 (2단계 점수 연계) */}
          <Section id="s6" title="위치 · 주변환경" description="2단계에서 매긴 추천 순서의 근거가 되는 항목이에요.">
            <Card>
              <CardBody className="space-y-6">
                <div className="rounded-[var(--radius-input)] bg-surface-muted/70 p-4 text-sm">
                  <p className="text-xs text-muted">도로명주소</p>
                  <p className="mt-1 font-semibold text-fg">{address}</p>
                </div>

                {rec ? (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-navy">나에게 추천된 이유</h3>
                    <ul className="space-y-1.5 text-sm">
                      {rec.reasons
                        .filter((r) => r.axis !== "eligibility")
                        .map((r, i) => (
                          <li key={i} className="flex gap-2">
                            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span className="text-fg">
                              {r.text} <span className="text-muted">{r.rawValue}</span>
                            </span>
                          </li>
                        ))}
                    </ul>
                    <div className="mt-4 border-t border-border pt-4">
                      <ScoreBreakdown byAxis={rec.score.byAxis} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted">
                      <Link href="/preferences" className="font-semibold text-primary underline">
                        2단계 생활 취향 설정
                      </Link>
                      을 완료하면 나에게 맞는 이유와 항목별 점수가 표시돼요.
                    </p>
                    <ScoreBreakdown byAxis={[]} />
                  </div>
                )}

                <NearbyInfraSection
                  unitId={unit.id}
                  origin={unit.coord}
                  includeEducation={pref.eduEnabled !== false}
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
                      <MetricTerm label="번화한 정도" value={bustleLabel(unit.source.neighborhood.bustlePercentile)} />
                      <MetricTerm label="조용한 정도" value={quietLabel(unit.source.neighborhood.noisePercentile)} />
                    </dl>
                  </div>
                )}
              </CardBody>
            </Card>
          </Section>
            </>
          )}

          {tab === "trust" && (
            <>
          {/* S7 — 데이터 신뢰성 */}
          <Section id="s7" title="데이터 신뢰성">
            <Card>
              <CardBody className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <SpecItem label="출처" value={sourceHead.rental_type ? `${sourceHead.rental_type} 재고 데이터` : null} />
                  <SpecItem label="좌표 정밀도" value={unit.source.geocodePrecision} />
                </dl>
                <MissingNote>
                  최종 갱신일과 가격 기준일(가격등록일)은 현재 데이터셋에 없어요. 확정 정보는 아래 원문 공고에서 확인해
                  주세요.
                </MissingNote>
                <a
                  href={unit.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
                >
                  원문 공고 보기 (LH청약플러스 · 부산도시공사)
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </CardBody>
            </Card>
          </Section>

          {/* S8 — 주택 리뷰 */}
          <Section id="s8" title={`주택 리뷰 (${reviews.length})`}>
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
                        <Badge key={t} tone="neutral">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </Section>
            </>
          )}

          {/* S9 — 신청하러 가기 */}
          <Section id="s9" title="신청하러 가기">
            <Card>
              <CardBody className="space-y-3">
                <InformationBanner tone="warning" title="모집 일정은 포함되어 있지 않아요">
                  현재 주택·임대조건 정보이며 실시간 모집공고가 아니에요. 신청 기간과 모집 상태는 공식 기관에서
                  확인하세요.
                </InformationBanner>
                <a
                  href={unit.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
                >
                  BMC · LH청약플러스로 신청하러 가기 <ExternalLink className="h-4 w-4" />
                </a>
              </CardBody>
            </Card>
          </Section>
        </div>

        {/* 사이드: 주변시설 요약 + 신청 CTA (지도는 S1에 한 번만 띄운다) */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-bold text-navy">주변시설 · 예상 정보</h2>
              <ul className="space-y-2 text-sm">
                {(
                  [
                    ["지하철역", unit.source.infra.subway],
                    ["대형마트", unit.source.infra.mart],
                    ["종합병원(차량)", unit.source.infra.hospital],
                    ["공원", unit.source.infra.park],
                  ] as [string, HousingMetric | null][]
                ).map(([label, value]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span className="text-muted">{label}</span>
                    <span className="font-medium text-fg">
                      {value ? formatDistance(value.distance) : "데이터 없음"}
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
            신청하러 가기 <ExternalLink className="h-4 w-4" />
          </a>
        </aside>
      </div>

      <Disclaimer className="mt-10" />
    </PageContainer>
  );
}
