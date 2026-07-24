import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  MapPin,
  ListChecks,
  FileCheck2,
  Wallet,
  Train,
  Building2,
  GraduationCap,
  Store,
  Trees,
  Clock,
  ShieldCheck,
  Sparkles,
  Filter,
  MessageSquareText,
} from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { InformationBanner, PrivacyNotice } from "@/components/common/banners";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/common/motion";
import { Reveal } from "@/components/common/Reveal";
import { cn } from "@/lib/utils";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { BASE_YEAR_BY_TYPE } from "@/config/eligibility-config.2025";

const PROCESS = [
  { icon: ClipboardCheck, title: "자격 확인", desc: "무주택·소득·자산 등 기본 자격을 먼저 진단해요." },
  { icon: MapPin, title: "생활 조건 입력", desc: "예산·희망 지역·생활 취향을 입력해요." },
  { icon: ListChecks, title: "추천 결과 확인", desc: "자격을 통과한 주택을 순서대로 추천해요." },
  { icon: FileCheck2, title: "공식 공고 확인", desc: "실제 신청 가능 여부는 모집공고에서 확정해요." },
];

const CRITERIA = [
  { icon: Wallet, title: "예산", desc: "보증금·월 임대료 (하드필터)" },
  { icon: Train, title: "출퇴근·통학", desc: "자주 가는 장소까지 거리 (0.30)" },
  { icon: Building2, title: "생활 인프라", desc: "병원·마트·공원·지하철 등 (0.25)" },
  { icon: GraduationCap, title: "돌봄·교육", desc: "어린이집·학교 (0.20)" },
  { icon: Store, title: "취향 시설", desc: "카페·편의점 등 밀도 (0.15)" },
  { icon: Trees, title: "동네 분위기", desc: "조용함 ~ 번화함 (0.10)" },
];

const DIFFERENTIATORS = [
  { icon: ShieldCheck, title: "자격을 먼저 분석해요", desc: "무주택·소득·자산을 진단해 신청 가능한 유형부터 가려내요." },
  { icon: Filter, title: "맞는 주택만 선별해요", desc: "자격을 통과한 주택만 후보로 남겨 헛걸음을 줄여요." },
  { icon: MapPin, title: "취향·입지를 함께 반영해요", desc: "예산·출퇴근·병원·학교·동네 분위기까지 반영해 순위를 매겨요." },
  { icon: MessageSquareText, title: "추천 이유를 설명해요", desc: "점수만 보여주지 않고 '왜 맞는지'를 쉬운 말로 알려줘요." },
  { icon: ListChecks, title: "신청 준비까지 이어줘요", desc: "주택별 준비 서류·확인 사항을 체크리스트로 정리해요." },
  { icon: Sparkles, title: "복잡한 공고를 쉽게", desc: "행정 용어를 풀어 설명하고 확인할 조건을 짚어줘요." },
] as const;

const TYPES = Object.entries(ELIGIBILITY_TYPE_LABEL) as [keyof typeof ELIGIBILITY_TYPE_LABEL, string][];

export default function LandingPage() {
  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="bg-primary-subtle/50">
        <PageContainer className="py-14 sm:py-20">
          <FadeIn>
            <Badge tone="primary" className="mb-4">
              부산 공공임대 · 자격 확인부터 추천까지
            </Badge>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-[2.6rem]">
              부산에서 나에게 맞는
              <br />
              공공임대주택 찾기
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              목록만 보여주지 않아요. <b className="text-fg">자격을 먼저 분석</b>하고, 예산·생활 취향까지 반영해
              <b className="text-fg"> 나에게 맞는 집만</b> 추천해요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/eligibility" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                내 자격 확인하고 추천받기 <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/recommendations" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                모집공고 먼저 둘러보기
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              <li className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" aria-hidden /> 약 3분 소요
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> 로그인 없이 무료
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-primary" aria-hidden /> 2026년 공고·소득·자산 기준
              </li>
            </ul>
          </FadeIn>
        </PageContainer>
      </section>

      {/* 차별점 — 그냥 목록이 아니에요 */}
      <PageContainer className="py-14">
        <SectionHeader
          eyebrow="무엇이 다른가요"
          title="공공임대 '목록'이 아니라 '추천'이에요"
          description="조건에 맞든 안 맞든 나열하는 검색과 달리, 부가가치는 이렇게 도와줘요."
        />
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((d) => (
            <Card key={d.title}>
              <CardBody className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-subtle text-primary">
                  <d.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-navy">{d.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{d.desc}</span>
                </span>
              </CardBody>
            </Card>
          ))}
        </Reveal>
      </PageContainer>

      {/* 이용 과정 */}
      <PageContainer className="py-14">
        <SectionHeader eyebrow="이용 과정" title="4단계로 끝나요" />
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((p, i) => (
            <Card key={p.title}>
              <CardBody>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary-subtle text-primary">
                  <p.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-primary">STEP {i + 1}</p>
                <p className="mt-1 text-lg font-bold text-navy">{p.title}</p>
                <p className="mt-1 text-sm text-muted">{p.desc}</p>
              </CardBody>
            </Card>
          ))}
        </Reveal>
      </PageContainer>

      {/* 지원 유형 */}
      <section className="bg-surface-muted/60 py-14">
        <PageContainer>
          <SectionHeader eyebrow="지원 임대 유형" title="5가지 유형을 함께 판정해요" />
          <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TYPES.map(([code, label]) => (
              <Card key={code}>
                <CardBody className="flex items-center justify-between">
                  <span className="font-semibold text-navy">{label}</span>
                  {BASE_YEAR_BY_TYPE[code] === 2025 && <Badge tone="warning">2025년 기준</Badge>}
                </CardBody>
              </Card>
            ))}
          </Reveal>
        </PageContainer>
      </section>

      {/* 추천 기준 */}
      <PageContainer className="py-14">
        <SectionHeader
          eyebrow="추천 기준"
          title="이런 조건으로 추천해요"
          description="예산·지역은 하드필터, 나머지는 가중치 점수로 반영돼요."
        />
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRITERIA.map((c) => (
            <Card key={c.title}>
              <CardBody className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-subtle text-primary">
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-navy">{c.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{c.desc}</span>
                </span>
              </CardBody>
            </Card>
          ))}
        </Reveal>
      </PageContainer>

      {/* 신뢰 안내 */}
      <PageContainer className="pb-16">
        <SectionHeader eyebrow="꼭 확인하세요" title="추천과 법적 자격 확정은 달라요" />
        <Reveal className="grid gap-4">
          <InformationBanner tone="warning" title="추천 결과 ≠ 신청 자격 확정">
            이 서비스의 판정·추천은 참고용이에요. 최종 신청 가능 여부는 각 유형의 공식 모집공고와 제출 서류로 확정됩니다.
          </InformationBanner>
          <InformationBanner tone="primary" title="사용 데이터 안내">
            자격 기준은 2026년 소득·자산 기준을 사용해요. 재개발임대는 2026 공고 미발표로 2025년 공고 기준을 안내합니다.
            시설·거리·상권 데이터는 현재 mock이며 실제 공공데이터 연동 예정이에요.
          </InformationBanner>
          <PrivacyNotice />
        </Reveal>
      </PageContainer>
    </div>
  );
}
