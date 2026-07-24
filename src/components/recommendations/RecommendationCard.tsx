"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Bookmark, ChevronRight, MapPin } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { bestCondition, type HousingUnit } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { AXIS_LABEL, type HousingRecommendation } from "@/features/recommendation/recommendation.types";
import { matchLevel } from "@/features/recommendation/recommendation.service";
import { useUserStore } from "@/features/user/user.store";

const STATUS = {
  open: { tone: "success" as const, label: "모집 중" },
  upcoming: { tone: "primary" as const, label: "모집 예정" },
  closed: { tone: "neutral" as const, label: "마감" },
};

export function RecommendationCard({
  rec,
  unit,
  active,
  onActivate,
}: {
  rec: HousingRecommendation;
  unit: HousingUnit;
  active?: boolean;
  onActivate?: () => void;
}) {
  const saved = useUserStore((s) => s.savedHousingIds.includes(unit.id));
  const toggleSaved = useUserStore((s) => s.toggleSaved);
  const best = bestCondition(unit);
  const st = STATUS[unit.recruitStatus];
  const match = matchLevel(rec);
  const topReasons = rec.reasons.filter((r) => r.axis !== "eligibility").slice(0, 1);

  return (
    <motion.article layout whileHover={{ y: -2 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
      <Card
        className={cn("transition-colors", active ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40")}
        onMouseEnter={onActivate}
        onFocus={onActivate}
      >
        <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {match && <Badge tone={match.tone}>적합도 · {match.label}</Badge>}
              <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[unit.type]}</Badge>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <h2 className="text-pretty text-lg font-bold text-navy">{unit.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {unit.gungu} · 전용 {unit.exclusiveAreas[0]}㎡~
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleSaved(unit.id)}
            aria-pressed={saved}
            aria-label={saved ? "저장 해제" : "관심 주택 저장"}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
              saved ? "border-primary bg-primary-subtle text-primary" : "border-border text-muted hover:bg-surface-muted",
            )}
          >
            <Bookmark className={cn("h-5 w-5", saved && "fill-current")} />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            보증금 <b className="text-fg">{formatManwon(best.deposit)}</b>
          </span>
          <span>
            월 임대료 <b className="text-fg">{formatManwon(best.monthlyRent)}</b>
          </span>
        </div>

        {topReasons.length > 0 && (
          <ul className="space-y-1.5 rounded-[var(--radius-input)] bg-surface-muted/70 p-3 text-sm">
            {topReasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <span className="text-fg">
                    {r.axis === "budget" ? r.text : `${AXIS_LABEL[r.axis as keyof typeof AXIS_LABEL] ?? ""} · ${r.text}`}
                  </span>{" "}
                  <span className="text-muted">{r.rawValue}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {rec.checkLater.length > 0 && (
          <p className="text-xs text-warning">확인 필요: {rec.checkLater[0]}</p>
        )}

        <div className="flex justify-end">
          <Link
            href={`/housing/${unit.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            상세 보기 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        </CardBody>
      </Card>
    </motion.article>
  );
}
