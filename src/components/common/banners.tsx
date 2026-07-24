import { Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "primary";

const toneMap: Record<Tone, string> = {
  info: "border-navy/15 bg-surface text-fg",
  primary: "border-primary/20 bg-primary-subtle text-fg",
  warning: "border-warning/25 bg-warning-subtle text-fg",
};

/** 정보/안내 배너. */
export function InformationBanner({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div className={cn("flex gap-3 rounded-[var(--radius-input)] border p-4", toneMap[tone], className)} role="note">
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "warning" ? "text-warning" : "text-primary")} aria-hidden />
      <div className="text-sm leading-relaxed">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div className="text-muted">{children}</div>
      </div>
    </div>
  );
}

/** "추천은 자격 확정이 아니에요" 상시 고지. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center justify-center gap-1.5 text-center text-sm text-muted", className)}>
      <Info className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      추천 결과는 법적 자격 확정이 아니에요. 실제 신청 가능 여부는 공식 모집공고에서 확인하세요.
    </p>
  );
}

/** 개인정보 사용 안내. */
export function PrivacyNotice({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-2 rounded-[var(--radius-input)] bg-surface-muted p-3 text-sm text-muted", className)}>
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>입력 정보(생년월일·소득·자산 등)는 브라우저에만 저장되고 자격 판정에만 사용돼요. 서버로 전송하지 않아요.</span>
    </div>
  );
}
