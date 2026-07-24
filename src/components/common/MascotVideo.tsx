"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { mascotSrc, type MascotPose } from "@/components/common/Mascot";

/** 마스코트 애니메이션 영상 (1920x1080, muted loop). */
export const VIDEO_SOURCES = {
  question: "question_galbung",
  read: "read_galbung",
  pickHouse: "pick_house",
  onTheMap: "on_the_map",
  markers: "markers",
} as const;

export type MascotVideoKey = keyof typeof VIDEO_SOURCES;

function videoSrc(key: MascotVideoKey): string {
  return `/assets/videos/${VIDEO_SOURCES[key]}.mp4`;
}

/** 각 영상의 첫 프레임 포스터(JPEG). 로드 전/reduced-motion 폴백 배경. */
function videoPoster(key: MascotVideoKey): string {
  return `/assets/videos/posters/${VIDEO_SOURCES[key]}.jpg`;
}

/**
 * 뷰포트 진입 시에만 로드/재생하는 자동재생 루프 영상.
 * 영상이 크므로(10~17MB) preload="none" + IntersectionObserver 지연 로딩.
 * prefers-reduced-motion 이면 영상 대신 정지 포즈 이미지를 렌더한다.
 */
export function MascotVideo({
  src,
  poster,
  className,
  objectClassName = "object-contain",
  fullPoster = false,
}: {
  src: MascotVideoKey;
  /** 정지 폴백에 쓰일 마스코트 포즈. fullPoster=true면 무시하고 영상 프레임 포스터 사용. */
  poster: MascotPose;
  className?: string;
  objectClassName?: string;
  /** 배경 꽉 채우기 모드: 영상 첫 프레임 JPEG을 포스터로 사용(투명 포즈 대신). */
  fullPoster?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
        } else {
          videoRef.current?.pause();
        }
      },
      { rootMargin: "200px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion]);

  // 소스가 붙은 뒤 로드/재생 (preload="none" 대응).
  useEffect(() => {
    if (!active) return;
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  }, [active]);

  const posterSrc = fullPoster ? videoPoster(src) : mascotSrc(poster);

  if (reduceMotion) {
    return (
      <div className={cn("relative", className)} aria-hidden>
        <Image src={posterSrc} alt="" fill sizes="960px" className={objectClassName} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)} aria-hidden>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        autoPlay
        preload="none"
        poster={posterSrc}
        className={cn("h-full w-full", objectClassName)}
      >
        {active && <source src={videoSrc(src)} type="video/mp4" />}
      </video>
    </div>
  );
}
