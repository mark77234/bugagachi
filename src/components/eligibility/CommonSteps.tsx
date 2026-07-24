"use client";

import { Plus, X } from "lucide-react";
import { useEligibilityStore } from "@/features/eligibility/eligibility.store";
import { ASSET_BRACKETS, CAR_OPTIONS, incomeBrackets } from "@/features/eligibility/eligibility.brackets";
import type { CarBand, MemberRelation } from "@/features/eligibility/eligibility.types";
import { RadioCards } from "@/components/ui/selectable";
import { InfoAccordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { calcKoreanAge } from "@/lib/formatting";

const YESNO = (yesLabel: string, noLabel: string) => [
  { value: "no", label: noLabel },
  { value: "yes", label: yesLabel },
];

function Field({ legend, help, children }: { legend: string; help?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6 last:mb-0">
      <legend className="mb-1 font-semibold text-fg">{legend}</legend>
      {help && <p className="mb-3 text-sm text-muted">{help}</p>}
      {children}
    </fieldset>
  );
}

const boolToVal = (b: boolean | null) => (b === null ? null : b ? "yes" : "no");

/** 스텝 A — 주택 소유 (게이트) */
export function StepA() {
  const { ownSelfHouse, ownMemberHouse, hasRestriction, setStepA } = useEligibilityStore();
  return (
    <div>
      <Field legend="현재 본인 명의로 소유한 주택이 있나요?" help="무주택 세대만 공공임대를 신청할 수 있어요.">
        <RadioCards
          name="ownSelf"
          columns={2}
          value={boolToVal(ownSelfHouse)}
          onChange={(v) => setStepA({ ownSelfHouse: v === "yes" })}
          options={YESNO("있음", "없음(무주택)")}
        />
      </Field>
      <Field legend="함께 사는 세대원 중 주택 소유자가 있나요?" help="세대 전체의 주택 소유 여부를 확인해요.">
        <RadioCards
          name="ownMember"
          columns={2}
          value={boolToVal(ownMemberHouse)}
          onChange={(v) => setStepA({ ownMemberHouse: v === "yes" })}
          options={YESNO("있음", "없음")}
        />
      </Field>
      <Field legend="공공임대 제한이력에 해당하나요?" help="계약 중·불법전대(4년 내)·재당첨 제한 등에 해당하는 경우예요.">
        <RadioCards
          name="restriction"
          columns={2}
          value={boolToVal(hasRestriction)}
          onChange={(v) => setStepA({ hasRestriction: v === "yes" })}
          options={YESNO("있음", "없음")}
        />
      </Field>
    </div>
  );
}

const RELATIONS: { value: MemberRelation; label: string }[] = [
  { value: "SPOUSE", label: "배우자" },
  { value: "PARENT", label: "부모" },
  { value: "CHILD", label: "자녀" },
  { value: "FETUS", label: "태아" },
];
const RELATION_LABEL: Record<MemberRelation, string> = {
  SELF: "본인",
  SPOUSE: "배우자",
  PARENT: "부모",
  CHILD: "자녀",
  FETUS: "태아",
};

/** 스텝 B — 가구·나이 */
export function StepB() {
  const { birthISO, setBirth, members, addMember, removeMember } = useEligibilityStore();
  const age = calcKoreanAge(birthISO);
  return (
    <div>
      <Field legend="생년월일을 입력해 주세요" help="만 나이는 자동으로 계산돼요.">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            className="max-w-[220px]"
            value={birthISO}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirth(e.target.value)}
            aria-label="생년월일"
          />
          {age !== null && (
            <span className="rounded-full bg-primary-subtle px-3 py-1.5 text-sm font-semibold text-primary">
              만 {age}세
            </span>
          )}
        </div>
      </Field>

      <Field legend="함께 거주하는 가구원" help="본인은 기본 포함돼요. 관계를 눌러 가구원을 추가하세요.">
        <ul className="mb-3 flex flex-wrap gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
            >
              {RELATION_LABEL[m.relation]}
              {m.relation !== "SELF" && (
                <button
                  type="button"
                  aria-label={`${RELATION_LABEL[m.relation]} 삭제`}
                  onClick={() => removeMember(m.id)}
                  className="rounded-full p-0.5 text-muted hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {RELATIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => addMember(r.value)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/40 bg-surface px-4 text-sm font-medium text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            >
              <Plus className="h-4 w-4" /> {r.label}
            </button>
          ))}
        </div>
        <InfoAccordion summary="태아도 가구원에 포함되나요?" className="mt-4">
          네. 임신 중인 태아는 가구원 수와 일부 유형의 완화 기준에 포함될 수 있어요. 실제 인정 여부는 모집공고 기준으로
          확인해요.
        </InfoAccordion>
      </Field>
    </div>
  );
}

/** 스텝 C — 소득·자산 */
export function StepC() {
  const { members, incomeBracketIndex, assetBracketIndex, carBand, setStepC } = useEligibilityStore();
  const size = Math.min(Math.max(members.length, 1), 8);
  const incomeOpts = incomeBrackets(size).map((b) => ({ value: String(b.index), label: b.label }));
  const assetOpts = ASSET_BRACKETS.map((b) => ({ value: String(b.index), label: b.label }));
  const carOpts = CAR_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

  return (
    <div>
      <Field legend={`세대 전체 월평균 소득 (세전) — ${size}인 가구 기준`} help="정확한 금액 대신 범위를 선택하면 돼요.">
        <RadioCards
          name="income"
          columns={1}
          value={incomeBracketIndex !== null ? String(incomeBracketIndex) : null}
          onChange={(v) => setStepC({ incomeBracketIndex: Number(v) })}
          options={incomeOpts}
        />
      </Field>

      <Field legend="가구 총자산 범위는?" help="부동산 + 자동차 + 금융 + 기타 − 부채 기준이에요.">
        <RadioCards
          name="asset"
          columns={1}
          value={assetBracketIndex !== null ? String(assetBracketIndex) : null}
          onChange={(v) => setStepC({ assetBracketIndex: Number(v) })}
          options={assetOpts}
        />
      </Field>

      <Field legend="가구 소유 차량 상태는?">
        <RadioCards
          name="car"
          columns={3}
          value={carBand}
          onChange={(v) => setStepC({ carBand: v as CarBand })}
          options={carOpts}
        />
      </Field>

      <InfoAccordion summary="왜 소득·자산을 확인하나요?">
        공공임대는 유형별로 소득·자산 상한이 정해져 있어요. 가구원 수에 따라 소득 구간이 달라지기 때문에 가구원을 먼저
        입력한 뒤 소득 구간이 표시돼요.
      </InfoAccordion>
    </div>
  );
}

/** 스텝 D — 지역 */
export function StepD() {
  const { livesInBusan, setLivesInBusan } = useEligibilityStore();
  return (
    <div>
      <Field legend="부산광역시에 거주 중인가요?" help="재개발임대·매입임대 일반은 부산 거주 조건이 적용돼요.">
        <RadioCards
          name="busan"
          columns={2}
          value={boolToVal(livesInBusan)}
          onChange={(v) => setLivesInBusan(v === "yes")}
          options={[
            { value: "yes", label: "예, 거주 중" },
            { value: "no", label: "아니오" },
          ]}
        />
      </Field>
      <InfoAccordion summary="위치 정보를 수집하나요?">
        아니요. 거주 여부만 직접 선택받고, 위치 정보를 자동으로 수집하지 않아요.
      </InfoAccordion>
    </div>
  );
}
