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
} from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { InformationBanner, PrivacyNotice } from "@/components/common/banners";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/common/motion";
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
              자격 확인부터 생활 취향 추천까지. 로그인 없이 바로 체험할 수 있어요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/eligibility" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                추천 시작하기 <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/recommendations" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                모집공고 둘러보기
              </Link>
            </div>
          </FadeIn>
        </PageContainer>
      </section>

      {/* 이용 과정 */}
      <PageContainer className="py-14">
        <SectionHeader eyebrow="이용 과정" title="4단계로 끝나요" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </PageContainer>

      {/* 지원 유형 */}
      <section className="bg-surface-muted/60 py-14">
        <PageContainer>
          <SectionHeader eyebrow="지원 임대 유형" title="5가지 유형을 함께 판정해요" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TYPES.map(([code, label]) => (
              <Card key={code}>
                <CardBody className="flex items-center justify-between">
                  <span className="font-semibold text-navy">{label}</span>
                  {BASE_YEAR_BY_TYPE[code] === 2025 && <Badge tone="warning">2025년 기준</Badge>}
                </CardBody>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* 추천 기준 */}
      <PageContainer className="py-14">
        <SectionHeader
          eyebrow="추천 기준"
          title="이런 조건으로 추천해요"
          description="예산·지역은 하드필터, 나머지는 가중치 점수로 반영돼요."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </PageContainer>

      {/* 신뢰 안내 */}
      <PageContainer className="pb-16">
        <SectionHeader eyebrow="꼭 확인하세요" title="추천과 법적 자격 확정은 달라요" />
        <div className="grid gap-4">
          <InformationBanner tone="warning" title="추천 결과 ≠ 신청 자격 확정">
            이 서비스의 판정·추천은 참고용이에요. 최종 신청 가능 여부는 각 유형의 공식 모집공고와 제출 서류로 확정됩니다.
          </InformationBanner>
          <InformationBanner tone="primary" title="사용 데이터 안내">
            자격 기준은 2026년 소득·자산 기준을 사용해요. 재개발임대는 2026 공고 미발표로 2025년 공고 기준을 안내합니다.
            시설·거리·상권 데이터는 현재 mock이며 실제 공공데이터 연동 예정이에요.
          </InformationBanner>
          <PrivacyNotice />
        </div>
      </PageContainer>
    </div>
  );
}
