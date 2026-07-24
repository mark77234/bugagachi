"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ServiceTone = "primary" | "warm" | "map";
type ServiceSize = "primary" | "secondary";

const TONE_STYLES: Record<ServiceTone, string> = {
  primary: "border-primary bg-primary text-white",
  warm: "border-warning/15 bg-warning-subtle text-fg",
  map: "border-primary/15 bg-primary-subtle text-fg",
};

const EYEBROW_STYLES: Record<ServiceTone, string> = {
  primary: "text-white/75",
  warm: "text-warning",
  map: "text-primary",
};

const DESCRIPTION_STYLES: Record<ServiceTone, string> = {
  primary: "text-white/80",
  warm: "text-muted",
  map: "text-muted",
};

const ACTION_STYLES: Record<ServiceTone, string> = {
  primary: "bg-white text-primary",
  warm: "bg-warning text-white",
  map: "bg-primary text-white",
};

export function ServiceEntryCard({
  href,
  eyebrow,
  title,
  description,
  actionLabel,
  tone,
  size = "secondary",
  illustration,
  badge,
  highlights,
  delay = 0,
  className,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  tone: ServiceTone;
  size?: ServiceSize;
  illustration: ReactNode;
  badge?: string;
  highlights?: string[];
  delay?: number;
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { y: 1 }}
      transition={{ duration: 0.22, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("h-full", className)}
    >
      <Link
        href={href}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "group relative flex h-full min-h-[280px] overflow-hidden rounded-[var(--radius-cardlg)] border p-7 shadow-[var(--shadow-card)]",
          "interactive-card transition-[border-color,box-shadow] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ring)]",
          size === "primary" && "min-h-[340px] sm:p-9 lg:min-h-[576px]",
          TONE_STYLES[tone],
        )}
      >
        <div className={cn("relative z-10 flex w-full flex-col", size === "primary" ? "max-w-[68%] sm:max-w-[60%]" : "max-w-[68%]")}>
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("text-sm font-semibold", EYEBROW_STYLES[tone])}>{eyebrow}</p>
            {badge && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  tone === "primary" ? "bg-white/15 text-white" : "bg-surface/80 text-navy",
                )}
              >
                {badge}
              </span>
            )}
          </div>

          <h2
            id={titleId}
            className={cn(
              "mt-3 text-balance text-2xl font-extrabold leading-tight",
              size === "primary" && "text-3xl sm:text-4xl",
              tone === "primary" ? "text-white" : "text-navy",
            )}
          >
            {title}
          </h2>
          <p id={descriptionId} className={cn("mt-3 text-sm leading-relaxed sm:text-base", DESCRIPTION_STYLES[tone])}>
            {description}
          </p>

          {highlights && highlights.length > 0 && (
            <ol className={cn("mt-6 hidden gap-2 text-sm sm:flex sm:flex-wrap", tone === "primary" ? "text-white/85" : "text-muted")}>
              {highlights.map((highlight, index) => (
                <li key={highlight} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      tone === "primary" ? "bg-white/15 text-white" : "bg-surface text-primary",
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  {highlight}
                </li>
              ))}
            </ol>
          )}

          <span className="mt-auto flex items-end gap-3 pt-8">
            <span className="sr-only">{actionLabel}</span>
            <span
              aria-hidden
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full shadow-[var(--shadow-sm)]",
                ACTION_STYLES[tone],
              )}
            >
              <ArrowRight className="h-5 w-5 transition-transform duration-[180ms] group-hover:translate-x-1" />
            </span>
          </span>
        </div>

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 right-0 flex items-end justify-end",
            size === "primary" ? "h-[66%] w-[54%] sm:h-[70%]" : "h-[62%] w-[48%]",
          )}
        >
          {illustration}
        </div>
      </Link>
    </motion.article>
  );
}
