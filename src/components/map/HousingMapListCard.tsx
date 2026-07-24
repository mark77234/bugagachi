"use client";

import Link from "next/link";
import { Building2, CalendarDays, ChevronRight, LocateFixed, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { bestCondition, type HousingUnit } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";

const STATUS = {
  open: { tone: "success" as const, label: "모집 중" },
  upcoming: { tone: "primary" as const, label: "모집 예정" },
  closed: { tone: "neutral" as const, label: "마감" },
  unknown: { tone: "neutral" as const, label: "공고 확인 필요" },
};

export function HousingMapListCard({
  unit,
  selected,
  onSelect,
}: {
  unit: HousingUnit;
  selected: boolean;
  onSelect: () => void;
}) {
  const condition = bestCondition(unit);
  const status = STATUS[unit.recruitStatus];

  return (
    <article
      data-map-unit={unit.id}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "rounded-[var(--radius-card)] border bg-surface p-4 shadow-[var(--shadow-sm)] transition-colors",
        selected ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/40",
      )}
      onMouseEnter={onSelect}
      onFocus={onSelect}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral">{ELIGIBILITY_TYPE_LABEL[unit.type]}</Badge>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <h3 className="mt-2 text-lg font-bold">{unit.name}</h3>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{unit.address}</span>
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-[var(--radius-input)] bg-surface-muted/70 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted">보증금</dt>
          <dd className="font-semibold text-fg">
            {condition ? formatManwon(condition.deposit) : "미공개"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">월 임대료</dt>
          <dd className="font-semibold text-fg">
            {condition ? formatManwon(condition.monthlyRent) : "미공개"}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-primary" aria-hidden />
          <span>{unit.supplyCount}세대</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          <span>공식 공고 확인</span>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(buttonVariants({ variant: selected ? "secondary" : "outline", size: "sm" }))}
        >
          <LocateFixed className="h-4 w-4" aria-hidden />
          지도에서 보기
        </button>
        <Link href={`/housing/${unit.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          상세 보기 <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
