import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  ListChecks,
  MapPin,
  ShieldCheck,
  Database,
} from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { Mascot, type MascotPose } from "@/components/common/Mascot";
import { MascotVideo, type MascotVideoKey } from "@/components/common/MascotVideo";
import { SectionHeader } from "@/components/common/SectionHeader";
import { InformationBanner, PrivacyNotice } from "@/components/common/banners";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/common/motion";
import { Reveal } from "@/components/common/Reveal";
import { ServiceEntryCard } from "@/components/landing/ServiceEntryCard";
import {
  ChatIllustration,
  MapIllustration,
  RecommendationIllustration,
} from "@/components/landing/ServiceIllustrations";
import { cn } from "@/lib/utils";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { BASE_YEAR_BY_TYPE } from "@/config/eligibility-config.2025";
import { RENTAL_DATASET_STATS } from "@/mocks/housing";

const PROCESS: { icon: typeof ClipboardCheck; pose: MascotPose; title: string; desc: string }[] = [
  { icon: ClipboardCheck, pose: "checklist", title: "자격 확인", desc: "기본 신청 조건을 확인해요." },
  { icon: MapPin, pose: "mapLocation", title: "생활 취향 입력", desc: "예산과 희망 생활권을 골라요." },
  { icon: ListChecks, pose: "compareHousing", title: "맞춤 추천 확인", desc: "추천 주택과 이유를 살펴봐요." },
  { icon: FileCheck2, pose: "documentDirection", title: "공식 공고 확인", desc: "신청 전 최종 조건을 확인해요." },
];

const TYPES = Object.entries(ELIGIBILITY_TYPE_LABEL) as [keyof typeof ELIGIBILITY_TYPE_LABEL, string][];

const VIDEO_FEATURES: {
  video: MascotVideoKey;
  poster: MascotPose;
  eyebrow: string;
  title: string;
  desc: string;
}[] = [
  {
    video: "read",
    poster: "readDocument",
    eyebrow: "01 · 자격 확인",
    title: "복잡한 자격 조건, 갈붕이가 쉽게 읽어드려요",
    desc: "무주택·소득·자산 같은 기본 조건을 질문으로 하나씩 확인해요. 어려운 서류 용어 없이 신청 가능성이 있는 유형을 골라줘요.",
  },
  {
    video: "pickHouse",
    poster: "present",
    eyebrow: "02 · 맞춤 추천",
    title: "예산과 생활 취향에 맞는 집을 골라줘요",
    desc: "자주 가는 곳, 생활권, 예산을 반영해 후보 주택의 순서를 매기고, 왜 추천했는지 이유까지 함께 보여드려요.",
  },
  {
    video: "question",
    poster: "readDocument",
    eyebrow: "03 · AI 갈붕이",
    title: "AI 갈붕이에게 언제든 물어보세요",
    desc: "공공임대 안내부터 예산·생활 취향 맞춤 추천까지, AI 갈붕이가 대화로 도와드려요.",
  },
  {
    video: "onTheMap",
    poster: "mapLocation",
    eyebrow: "04 · 지도 탐색",
    title: "부산 어디에 있는 집인지 지도에서 확인해요",
    desc: "추천받은 집이 어느 동네에 있는지, 생활권이 어떤지 지도에서 한눈에 살펴볼 수 있어요.",
  },
  {
    video: "markers",
    poster: "mapSearch",
    eyebrow: "05 · 전체 둘러보기",
    title: "부산 전역의 공공임대를 마커로 한눈에",
    desc: "자격 확인 전이라도 부산 곳곳의 공공임대주택을 지도 마커로 자유롭게 둘러볼 수 있어요.",
  },
];

export default function LandingPage() {
  return (
    <div className="pb-8">
      <section className="border-b border-primary/10 bg-primary-subtle/55">
        <PageContainer size="wide" className="py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
            <FadeIn y={12}>
              <Mascot pose="wave" float className="mb-3 h-24 w-24 lg:hidden" priority sizes="96px" />
              <Badge tone="primary" className="mb-5">
                부산 공공임대 · 자격 확인부터 추천까지
              </Badge>
              <h1 className="max-w-4xl text-balance text-3xl font-extrabold leading-tight sm:text-[2.75rem] lg:text-5xl">
                부산에서 나에게 맞는{" "}
                <span className="block">
                  <span className="whitespace-nowrap">공공임대주택을</span> 찾아보세요
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                복잡한 자격 조건은 쉽게 확인하고, 예산과 생활 방식에 맞는 주택까지 한 번에 추천받을 수 있어요.
              </p>
              <div className="mt-8">
                <Link href="/eligibility" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto")}>
                  내 조건으로 추천받기 <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </div>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  로그인 없이 시작
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  입력 정보는 이 브라우저에만 저장
                </li>
              </ul>
            </FadeIn>

            <FadeIn delay={0.06} y={10} className="hidden lg:block">
              <div className="relative overflow-hidden rounded-[var(--radius-cardlg)] border border-primary/15 shadow-[var(--shadow-card)]">
                <Image
                  src="/assets/wallpapers/hf_20260724_120406_f313782a-7cc8-42fb-b2c0-c812e1158941.png"
                  alt="집 모양 모자를 쓴 마스코트 갈붕이가 추천·지도·채팅 정보를 안내하는 모습"
                  width={800}
                  height={451}
                  priority
                  className="aspect-[4/3] w-full object-cover object-right"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-primary/85 to-transparent px-4 pb-4 pt-10 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                  자격 · 예산 · 생활 취향으로 만드는 맞춤 추천
                </div>
              </div>
            </FadeIn>
          </div>
        </PageContainer>
      </section>

      <PageContainer size="wide" className="py-12 sm:py-16">
        <div className="mb-7">
          <p className="text-sm font-semibold text-primary">어디서부터 시작할까요?</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">필요한 도움을 바로 선택하세요</h2>
          <p className="mt-2 max-w-2xl text-muted">추천을 먼저 받거나, 궁금한 정보를 묻거나, 부산 전체 주택을 둘러볼 수 있어요.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <ServiceEntryCard
            href="/eligibility"
            eyebrow="자격과 생활 취향을 함께"
            title="나에게 맞는 집 추천받기"
            description="간단한 질문에 답하면 신청 가능성이 있는 유형을 확인하고, 예산과 생활 취향에 맞는 주택을 추천해요."
            actionLabel="자격 확인부터 시작해 맞춤 주택 추천받기"
            tone="primary"
            size="primary"
            illustration={<RecommendationIllustration />}
            illustrationFill
            highlights={["자격 확인", "취향 입력", "추천 이유"]}
            className="lg:col-span-7 lg:row-span-2"
          />
          <ServiceEntryCard
            href="/chat"
            eyebrow="AI 갈붕이"
            title="AI 갈붕이에게 물어보기"
            description="공공임대 안내부터 예산·생활 취향 맞춤 주택 추천까지, AI 갈붕이가 도와드려요."
            actionLabel="AI 갈붕이 시작하기"
            tone="warm"
            illustration={<ChatIllustration />}
            illustrationFill
            delay={0.04}
            className="lg:col-span-5"
          />
          <ServiceEntryCard
            href="/map"
            eyebrow="부산 공공임대주택을 한눈에"
            title="지도에서 전체 주택 둘러보기"
            description={`부산 공공임대주택 ${RENTAL_DATASET_STATS.buildings}개 건물을 지도에서 한눈에 살펴보세요.`}
            actionLabel="부산 공공임대 전체 지도 열기"
            tone="map"
            illustration={<MapIllustration />}
            illustrationFill
            delay={0.08}
            className="lg:col-span-5"
          />
        </div>

        <aside className="mt-5 grid gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-sm text-muted shadow-[var(--shadow-sm)] sm:grid-cols-3" aria-label="서비스 신뢰 안내">
          <p className="flex items-center gap-2 px-2 py-1">
            <Database className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            부산 공공임대 {RENTAL_DATASET_STATS.validRows}호실 · {RENTAL_DATASET_STATS.buildings}개 건물
          </p>
          <p className="flex items-center gap-2 px-2 py-1">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            입력 정보는 내 브라우저에만 저장
          </p>
          <p className="flex items-center gap-2 px-2 py-1">
            <FileCheck2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            신청 전 공식 공고 확인 필수
          </p>
        </aside>
      </PageContainer>

      <section className="relative overflow-hidden py-14 sm:py-20">
        <Image
          src="/assets/wallpapers/hf_20260724_120349_438fc9d3-b715-4a63-92c8-29e5ffd80cd0.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-right opacity-40"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/85 to-bg" aria-hidden />
        <PageContainer size="wide" className="relative">
          <SectionHeader
            eyebrow="영상으로 보는 부가가치"
            title="이렇게 도와드려요"
            description="자격 확인부터 맞춤 추천, 지도 탐색까지 — 갈붕이가 단계마다 함께해요."
          />
          <div className="mt-8 flex flex-col gap-6 sm:gap-10">
            {VIDEO_FEATURES.map((f, i) => (
              <Reveal
                key={f.video}
                y={16}
                className={cn(
                  "grid items-center gap-5 sm:gap-8 lg:grid-cols-2",
                )}
              >
                <div className={cn("overflow-hidden rounded-[var(--radius-cardlg)] border border-border bg-surface shadow-[var(--shadow-card)]", i % 2 === 1 && "lg:order-2")}>
                  <MascotVideo
                    src={f.video}
                    poster={f.poster}
                    fullPoster
                    className="aspect-video w-full"
                    objectClassName="object-cover"
                  />
                </div>
                <div className={cn(i % 2 === 1 && "lg:order-1")}>
                  <p className="text-sm font-bold text-primary">{f.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-extrabold text-navy sm:text-2xl">{f.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="bg-surface-muted/60 py-12 sm:py-16">
        <PageContainer size="wide">
          <SectionHeader
            eyebrow="맞춤 추천 이용 과정"
            title="자격 확인부터 신청 준비까지 이어져요"
            description="추천 결과는 참고용이며, 실제 신청 전에는 반드시 공식 모집공고를 확인해야 해요."
          />
          <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" y={12}>
            {PROCESS.map((step, index) => (
              <Card key={step.title}>
                <CardBody className="h-full">
                  <div className="mb-3 flex items-start justify-between">
                    <Mascot pose={step.pose} className="h-20 w-20" sizes="80px" />
                    <span className="text-sm font-bold text-primary">0{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <step.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <h3 className="text-lg font-bold">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted">{step.desc}</p>
                </CardBody>
              </Card>
            ))}
          </Reveal>
        </PageContainer>
      </section>

      <PageContainer size="wide" className="py-12 sm:py-16">
        <SectionHeader
          eyebrow="지원 임대 유형"
          title="5가지 공공임대 유형을 함께 확인해요"
          description="자격 기준과 주택 정보는 실제 신청 자격을 확정하지 않아요."
        />
        <Reveal className="flex flex-wrap gap-2" y={10}>
          {TYPES.map(([code, label]) => (
            <span
              key={code}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 font-semibold text-navy"
            >
              {label}
              {BASE_YEAR_BY_TYPE[code] === 2025 && <Badge tone="warning">2025년 기준</Badge>}
            </span>
          ))}
        </Reveal>
      </PageContainer>

      <PageContainer size="wide" className="pb-16">
        <SectionHeader eyebrow="꼭 확인하세요" title="추천과 법적 자격 확정은 달라요" />
        <Reveal className="grid gap-4 lg:grid-cols-2" y={10}>
          <InformationBanner tone="warning" title="추천 결과는 참고용이에요">
            최종 신청 가능 여부는 각 유형의 공식 모집공고와 제출 서류로 확인해야 합니다.
          </InformationBanner>
          <InformationBanner tone="primary" title="부산 공공임대 주택·생활권 정보를 사용해요">
            {RENTAL_DATASET_STATS.validRows}호실을 {RENTAL_DATASET_STATS.buildings}개 건물로 묶어 보여주며,
            모집 상태와 신청 일정은 포함되어 있지 않아요.
          </InformationBanner>
          <PrivacyNotice className="lg:col-span-2" />
        </Reveal>
      </PageContainer>
    </div>
  );
}
