"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** 최초 등장 fade+up. reducedMotion은 MotionProvider가 존중. */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay }}
    >
      {children}
    </motion.div>
  );
}

/** 자식들을 stagger로 등장시키는 컨테이너. */
export function StaggerList({
  children,
  className,
  gap = 0.05,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  );
}
