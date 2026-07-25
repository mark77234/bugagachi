"use client";

import { ShieldCheck } from "lucide-react";
import {
  householdSizeOf,
  needsHouseholdAmounts,
  needsSelfAmounts,
  useEligibilityStore,
} from "@/features/eligibility/eligibility.store";
import { ASSET_BRACKETS, CAR_OPTIONS, incomeBrackets } from "@/features/eligibility/eligibility.brackets";
import { calcKoreanAge, withThousands } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { Bracket } from "@/features/eligibility/eligibility.brackets";

function Row({ label, value }: { label: string; value: string }) {
  const empty = value === "—";
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("text-right font-medium", empty ? "text-border" : "text-fg")}>{value}</dd>
    </div>
  );
}

const yn = (v: boolean | null, t: string, f: string) => (v === null ? "—" : v ? t : f);

function amountLabel(exact: number | null, bracketIndex: number | null, brackets: Bracket[]): string {
  if (exact !== null) return `${withThousands(exact)}만원`;
  if (bracketIndex !== null) return brackets[bracketIndex]?.label ?? "—";
  return "—";
}

/** 입력 요약 사이드바 (이미지의 우측 카드). */
export function SummarySidebar({ className }: { className?: string }) {
  const s = useEligibilityStore();
  const size = householdSizeOf(s);
  const age = calcKoreanAge(s.birthISO);

  const selfIncome = amountLabel(s.selfIncomeManwonExact, s.selfIncomeBracketIndex, incomeBrackets(1));
  const selfAsset = amountLabel(s.selfAssetManwonExact, s.selfAssetBracketIndex, ASSET_BRACKETS);
  const income = amountLabel(s.incomeManwonExact, s.incomeBracketIndex, incomeBrackets(size));
  const asset = amountLabel(s.assetManwonExact, s.assetBracketIndex, ASSET_BRACKETS);
  const car = s.carBand ? CAR_OPTIONS.find((o) => o.value === s.carBand)?.label ?? "—" : "—";

  return (
    <aside className={cn("rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] lg:sticky lg:top-24", className)} aria-label="입력 요약">
      <h3 className="mb-2 text-sm font-bold text-navy">입력 요약</h3>
      <dl className="divide-y divide-border/70">
        <Row label="본인 주택" value={yn(s.ownSelfHouse, "있음", "없음(무주택)")} />
        <Row label="세대원 주택" value={yn(s.ownMemberHouse, "있음", "없음")} />
        <Row label="제한이력" value={yn(s.hasRestriction, "있음", "없음")} />
        <Row label="만 나이" value={age !== null ? `${age}세` : "—"} />
        <Row label="세대구성원" value={`${size}명`} />
        {needsSelfAmounts(s) && (
          <>
            <Row label="본인 월소득" value={selfIncome} />
            <Row label="본인 총자산" value={selfAsset} />
          </>
        )}
        {needsHouseholdAmounts(s) && (
          <>
            <Row label="세대 월소득 합계" value={income} />
            <Row label="세대 총자산 합계" value={asset} />
          </>
        )}
        <Row label="자동차" value={car} />
        <Row label="부산 거주" value={yn(s.livesInBusan, "예", "아니오")} />
      </dl>
      <p className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        입력 정보는 자격 판정에만 사용돼요.
      </p>
    </aside>
  );
}
