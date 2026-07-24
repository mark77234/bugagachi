"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * 마스코트 "갈붕이" 포즈. 파일명(`/assets/poses/NN_name.png`)을 시맨틱 키로 노출한다.
 * 모든 포즈는 512x512 투명 PNG.
 */
export const MASCOT_POSES = {
  idle: "01_idle",
  wave: "02_wave",
  pointLeft: "03_point_left",
  wingsOpen: "04_wings_open",
  present: "05_present",
  pointUp: "06_point_up",
  pointRight: "07_point_right",
  search: "08_search_magnifier",
  checklist: "09_checklist",
  housePin: "10_house_pin",
  readDocument: "11_read_document",
  calculator: "12_calculator",
  thinking: "13_thinking",
  confused: "14_confused",
  fail: "15_fail",
  success: "16_success",
  info: "17_info",
  locked: "18_locked",
  warningDocument: "19_warning_document",
  alert: "20_alert",
  celebrate: "21_celebrate",
  sad: "22_sad",
  crying: "23_crying",
  mapLocation: "24_map_location",
  compareHousing: "25_compare_housing",
  calculate: "26_calculate",
  documentDirection: "27_document_direction",
  mapSearch: "28_map_search",
} as const;

export type MascotPose = keyof typeof MASCOT_POSES;

export function mascotSrc(pose: MascotPose): string {
  return `/assets/poses/${MASCOT_POSES[pose]}.png`;
}

export function Mascot({
  pose,
  className,
  sizes = "(max-width: 640px) 40vw, 320px",
  priority = false,
  float = false,
  alt,
  objectClassName = "object-contain",
}: {
  pose: MascotPose;
  /** 래퍼 크기를 결정하는 클래스 (예: "h-40 w-40"). 정사각형 권장. */
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** 부드러운 상하 플로팅. reduced-motion 시 자동 비활성. */
  float?: boolean;
  /** 지정 시 의미 있는 이미지로, 미지정 시 장식(aria-hidden). */
  alt?: string;
  /** 이미지 fit/position 제어 (작은 원형 아바타는 "object-cover object-top"). */
  objectClassName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const animate = float && !reduceMotion;

  const inner = (
    <Image
      src={mascotSrc(pose)}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      fill
      sizes={sizes}
      priority={priority}
      draggable={false}
      className={cn("select-none", objectClassName)}
    />
  );

  return (
    <motion.span
      className={cn("relative inline-block", className)}
      animate={animate ? { y: [0, -8, 0] } : undefined}
      transition={
        animate
          ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      {inner}
    </motion.span>
  );
}
