/** 주택 상세 페이지(S0~S9) 표시 전용 유틸·소형 컴포넌트.
 *  데이터가 없는 필드는 "미보유"로 숨기거나 명시하고, 절대 임의 값으로 채우지 않는다. */
import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

const PYEONG_PER_M2 = 3.305785;

/** 전용면적 표기: ㎡ + 평 병기. */
export function formatArea(m2: number): string {
  return `${m2}㎡ (${(m2 / PYEONG_PER_M2).toFixed(1)}평)`;
}

/** 방 개수 → 원룸/투룸/쓰리룸 라벨. */
export function roomLabel(count: number): string {
  if (count <= 1) return "원룸";
  if (count === 2) return "투룸";
  if (count === 3) return "쓰리룸";
  return `${count}룸`;
}

/** 준공연도 + 연식. 예: "1990년 준공 · 36년차" */
export function completionLabel(year: number, baseYear: number): string {
  return `${year}년 준공 · ${Math.max(baseYear - year, 0)}년차`;
}

/** 주차대수 0 → "주차 불가"로 명시 변환. */
export function parkingLabel(count: number | null): string {
  if (count === null) return "미공개";
  return count === 0 ? "주차 불가" : `${count}면`;
}

/** 도로명주소 괄호(법정동 등) 정제. */
export function cleanAddress(address: string): string {
  return address.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/** 임대유형 4종 배지 색상. */
export const RENTAL_TYPE_TONE: Record<EligibilityTypeCode, "primary" | "success" | "warning" | "neutral"> = {
  TONGHAP: "primary",
  HAENGBOK: "success",
  JAEGAEBAL: "warning",
  MAEIP_ILBAN: "neutral",
  MAEIP_CHUNG: "neutral",
};

/** 정의 목록 한 칸. value가 null이면 렌더링하지 않는다(미보유 항목 숨김). */
export function SpecItem({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null;
  return (
    <div className="rounded-[var(--radius-input)] bg-surface-muted/70 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-fg">{value}</dd>
    </div>
  );
}

/** 데이터셋에 없는 항목을 숨기지 않고 '미보유'로 밝힌다. */
export function MissingNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
