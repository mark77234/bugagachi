"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** 전역 Motion 설정. reducedMotion="user" → OS 설정 존중. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}
