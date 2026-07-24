import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EligibilityStatus } from "@/features/eligibility/eligibility.types";

const MAP = {
  PASS: { tone: "success" as const, icon: CheckCircle2, label: "신청 가능성 있음" },
  NEEDS_MORE: { tone: "warning" as const, icon: AlertCircle, label: "추가 확인 필요" },
  FAIL: { tone: "error" as const, icon: XCircle, label: "현재 조건상 어려움" },
};

/** 자격 상태 배지 — 색 + 아이콘 + 텍스트 병기(색 단독 금지). */
export function StatusBadge({ status }: { status: EligibilityStatus }) {
  const { tone, icon: Icon, label } = MAP[status];
  return (
    <Badge tone={tone}>
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Badge>
  );
}
