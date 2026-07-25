"use client";

import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { InfoAccordion } from "@/components/ui/accordion";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import type { EligibilityTypeResult } from "@/features/eligibility/eligibility.types";

export function TypeResultCard({ result }: { result: EligibilityTypeResult }) {
  const { type, evaluation, baseYear, appliedTier, evaluatedTiers } = result;
  const multiTier = (evaluatedTiers?.length ?? 0) > 1;
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy">{ELIGIBILITY_TYPE_LABEL[type]}</span>
            {appliedTier && <Badge tone="neutral">{appliedTier}</Badge>}
            {baseYear === 2025 && <Badge tone="warning">2025년 기준</Badge>}
          </div>
          <StatusBadge status={evaluation.status} />
        </div>

        {evaluation.status === "FAIL" ? (
          <InfoAccordion summary="제외 사유 보기">
            <ul className="list-disc space-y-1 pl-4">
              {evaluation.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </InfoAccordion>
        ) : (
          <p className="text-sm text-muted">{evaluation.reasons[0]}</p>
        )}

        {multiTier && (
          <p className="text-sm text-muted">
            함께 검토한 계층: <span className="font-semibold text-navy">{evaluatedTiers!.join(" · ")}</span>
          </p>
        )}

        {evaluation.checkLater.length > 0 && (
          <ul className="space-y-1 border-t border-border pt-3 text-sm text-muted">
            {evaluation.checkLater.map((c, i) => (
              <li key={i} className="flex gap-1.5">
                <span aria-hidden className="text-warning">
                  •
                </span>
                {c}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
