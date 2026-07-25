"use client";

import { useState } from "react";
import { QuestionCard } from "@/components/onboarding/QuestionCard";
import { RadioCards } from "@/components/ui/selectable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InformationBanner } from "@/components/common/banners";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import type {
  EligibilityDetailInput,
  EligibilityTypeCode,
  HaengbokTier,
  StudentStatus,
  TonghapTier,
} from "@/features/eligibility/eligibility.types";

const YESNO = [
  { value: "no", label: "아니오" },
  { value: "yes", label: "예" },
];

function NumberField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number | undefined;
  onChange: (n: number) => void;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block font-medium text-fg">{label}</span>
      <span className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          className="max-w-[200px]"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        {suffix && <span className="text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

export function DetailForm({
  candidates,
  onComplete,
  onBack,
}: {
  candidates: EligibilityTypeCode[];
  onComplete: () => void;
  onBack: () => void;
}) {
  const { detail, setDetail } = useEligibilityStore();
  const [idx, setIdx] = useState(0);
  const type = candidates[idx];

  const patch = (value: Record<string, unknown>) => {
    const cur = ((detail as Record<string, unknown>)[type] as Record<string, unknown>) ?? {};
    setDetail({ ...detail, [type]: { ...cur, ...value } } as EligibilityDetailInput);
  };

  const complete = isTypeComplete(type, detail);

  return (
    <QuestionCard
      title={`${ELIGIBILITY_TYPE_LABEL[type]} 세부 자격`}
      description="후보로 남은 유형만 물어봐요. 선택에 따라 소득·자산 기준이 달라져요."
      onPrev={() => (idx > 0 ? setIdx(idx - 1) : onBack())}
      onNext={() => (idx < candidates.length - 1 ? setIdx(idx + 1) : onComplete())}
      nextDisabled={!complete}
      isLast={idx === candidates.length - 1}
      nextLabel="다음 유형"
    >
      <div className="mb-4 flex items-center gap-2">
        <Badge tone="primary">
          {idx + 1} / {candidates.length}
        </Badge>
        <span className="text-sm text-muted">현재 {ELIGIBILITY_TYPE_LABEL[type]}의 세부 자격을 확인하고 있어요.</span>
      </div>

      {type === "JAEGAEBAL" && (
        <InformationBanner tone="warning" className="mb-5">
          재개발임대는 2026년 공고 미발표로 2025년 공고 기준으로 판정해요.
        </InformationBanner>
      )}

      {renderQuestions(type, detail, patch)}
    </QuestionCard>
  );
}

function renderQuestions(
  type: EligibilityTypeCode,
  detail: EligibilityDetailInput,
  patch: (v: Record<string, unknown>) => void,
) {
  if (type === "TONGHAP") {
    const d = detail.TONGHAP;
    return (
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 font-semibold">해당하는 계층을 선택해 주세요</legend>
          <RadioCards<TonghapTier>
            name="tonghap-tier"
            columns={2}
            value={d?.tier ?? null}
            onChange={(v) => patch({ tier: v })}
            options={[
              { value: "청년", label: "청년" },
              { value: "신혼한부모", label: "신혼·한부모" },
              { value: "고령자", label: "고령자" },
              { value: "일반", label: "일반" },
            ]}
          />
        </fieldset>
        {d?.tier === "신혼한부모" && (
          <>
            <NumberField label="혼인신고 후 몇 개월 지났나요? (84개월 이내)" suffix="개월" value={d?.marriageMonths} onChange={(n) => patch({ marriageMonths: n })} />
            <fieldset>
              <legend className="mb-3 font-semibold">본인·배우자 모두 소득이 있나요?</legend>
              <RadioCards
                name="tonghap-dual"
                columns={2}
                value={d?.dualIncome === undefined ? null : d.dualIncome ? "yes" : "no"}
                onChange={(v) => patch({ dualIncome: v === "yes" })}
                options={YESNO}
              />
            </fieldset>
          </>
        )}
      </div>
    );
  }

  if (type === "HAENGBOK") {
    const d = detail.HAENGBOK;
    const needStatus = d?.tier === "대학생" || d?.tier === "사회초년생";
    return (
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 font-semibold">해당하는 계층을 선택해 주세요</legend>
          <RadioCards<HaengbokTier>
            name="haengbok-tier"
            columns={2}
            value={d?.tier ?? null}
            onChange={(v) => patch({ tier: v })}
            options={[
              { value: "대학생", label: "대학생" },
              { value: "청년", label: "청년" },
              { value: "사회초년생", label: "사회초년생" },
              { value: "신혼한부모", label: "신혼·한부모" },
              { value: "고령자", label: "고령자" },
              { value: "주거급여", label: "주거급여수급자" },
            ]}
          />
        </fieldset>
        {needStatus && (
          <fieldset>
            <legend className="mb-3 font-semibold">현재 상태는?</legend>
            <RadioCards<StudentStatus>
              name="haengbok-status"
              columns={3}
              value={d?.studentStatus ?? null}
              onChange={(v) => patch({ studentStatus: v })}
              options={[
                { value: "재학", label: "재학 중" },
                { value: "졸업2년내", label: "졸업 2년 내" },
                { value: "소득활동5년내", label: "소득활동 5년 내" },
              ]}
            />
          </fieldset>
        )}
        {d?.tier === "신혼한부모" && (
          <>
            <NumberField label="혼인신고 후 몇 개월 지났나요?" suffix="개월" value={d?.marriageMonths} onChange={(n) => patch({ marriageMonths: n })} />
            <fieldset>
              <legend className="mb-3 font-semibold">본인·배우자 모두 소득이 있나요?</legend>
              <RadioCards
                name="haengbok-dual"
                columns={2}
                value={d?.dualIncome === undefined ? null : d.dualIncome ? "yes" : "no"}
                onChange={(v) => patch({ dualIncome: v === "yes" })}
                options={YESNO}
              />
            </fieldset>
          </>
        )}
      </div>
    );
  }

  if (type === "JAEGAEBAL") {
    const d = detail.JAEGAEBAL;
    return (
      <fieldset>
        <legend className="mb-3 font-semibold">2023.3.28 이후 출산(입양·태아 포함) 자녀 수는?</legend>
        <RadioCards
          name="jaegaebal-children"
          columns={3}
          value={d ? String(d.children) : null}
          onChange={(v) => patch({ children: Number(v) })}
          options={[
            { value: "0", label: "0명" },
            { value: "1", label: "1명" },
            { value: "2", label: "2명 이상" },
          ]}
        />
      </fieldset>
    );
  }

  if (type === "MAEIP_ILBAN") {
    const d = detail.MAEIP_ILBAN;
    return (
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 font-semibold">수급·한부모·차상위·65세·장애인에 해당하나요? (1순위)</legend>
          <RadioCards
            name="ilban-rank1"
            columns={2}
            value={d?.isRank1 === undefined ? null : d.isRank1 ? "yes" : "no"}
            onChange={(v) => patch({ isRank1: v === "yes" })}
            options={[
              { value: "yes", label: "예 (1순위)" },
              { value: "no", label: "아니오 (2순위)" },
            ]}
          />
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-semibold">2023.3.28 이후 출산 자녀 수는?</legend>
          <RadioCards
            name="ilban-children"
            columns={3}
            value={d?.children !== undefined ? String(d.children) : null}
            onChange={(v) => patch({ children: Number(v) })}
            options={[
              { value: "0", label: "0명" },
              { value: "1", label: "1명" },
              { value: "2", label: "2명 이상" },
            ]}
          />
        </fieldset>
        <p className="text-sm text-muted">1순위는 소득 무관, 2순위는 도시근로자 소득 50% 기준이 적용돼요.</p>
      </div>
    );
  }

  // MAEIP_CHUNG
  const d = detail.MAEIP_CHUNG;
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 font-semibold">
          본인(또는 같은 세대 부모)이 생계·의료·주거급여 수급자, 한부모가족, 차상위계층에 해당하나요?
        </legend>
        <RadioCards
          name="chung-rank1"
          columns={2}
          value={d?.isRank1 === undefined ? null : d.isRank1 ? "yes" : "no"}
          onChange={(v) => patch({ isRank1: v === "yes", rank: undefined })}
          options={[
            { value: "yes", label: "예 (1순위)" },
            { value: "no", label: "아니오" },
          ]}
        />
      </fieldset>
      {d?.isRank1 === false && (
        <fieldset>
          <legend className="mb-3 font-semibold">부모님의 소득·자산 정보를 입력할 수 있나요?</legend>
          <RadioCards
            name="chung-rank"
            columns={2}
            value={d?.rank ? String(d.rank) : null}
            onChange={(v) => patch({ rank: Number(v) })}
            options={[
              { value: "2", label: "입력할 수 있어요", description: "부모 정보를 받아 2순위를 먼저 확인해요." },
              { value: "3", label: "입력이 어려워요", description: "본인 정보로 3순위를 확인해요." },
            ]}
          />
        </fieldset>
      )}
      {d?.isRank1 === false && d?.rank === 2 && (
        <div>
          <NumberField label="부모의 월평균 소득" suffix="만원" value={d?.parentIncomeManwon} onChange={(n) => patch({ parentIncomeManwon: n })} />
          <NumberField label="부모의 총자산" suffix="만원" value={d?.parentAssetManwon} onChange={(n) => patch({ parentAssetManwon: n })} />
          <p className="text-sm text-muted">
            본인+부모 기준이 2순위를 넘으면, 입력한 본인 정보로 3순위를 자동 확인해요.
          </p>
        </div>
      )}
    </div>
  );
}

function isTypeComplete(type: EligibilityTypeCode, detail: EligibilityDetailInput): boolean {
  switch (type) {
    case "TONGHAP": {
      const d = detail.TONGHAP;
      if (!d?.tier) return false;
      if (d.tier === "신혼한부모") return !!d.marriageMonths && d.dualIncome !== undefined;
      return true;
    }
    case "HAENGBOK": {
      const d = detail.HAENGBOK;
      if (!d?.tier) return false;
      if (d.tier === "대학생" || d.tier === "사회초년생") return !!d.studentStatus;
      if (d.tier === "신혼한부모") return !!d.marriageMonths && d.dualIncome !== undefined;
      return true;
    }
    case "JAEGAEBAL":
      return detail.JAEGAEBAL?.children !== undefined;
    case "MAEIP_ILBAN": {
      const d = detail.MAEIP_ILBAN;
      return d?.isRank1 !== undefined && d?.children !== undefined;
    }
    case "MAEIP_CHUNG": {
      const d = detail.MAEIP_CHUNG;
      if (d?.isRank1 === undefined) return false;
      if (d.isRank1) return true;
      if (!d.rank) return false;
      if (d.rank === 2) return d.parentIncomeManwon !== undefined && d.parentAssetManwon !== undefined;
      return true;
    }
    default:
      return false;
  }
}
