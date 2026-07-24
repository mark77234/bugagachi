/** 숫자 포매팅 유틸. 금액은 "만원" 단위 입력을 다룬다. */

/** 1234567 -> "1,234,567" */
export function withThousands(value: number | string): string {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.-]/g, "")) : value;
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("ko-KR");
}

/** 만원 단위 금액을 한국식 표기로. 예: 15000 -> "1억 5,000만원", 280 -> "280만원" */
export function formatManwon(manwon: number): string {
  if (!Number.isFinite(manwon)) return "-";
  if (manwon <= 0) return "0원";
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  if (eok > 0 && rest > 0) return `${eok}억 ${withThousands(rest)}만원`;
  if (eok > 0) return `${eok}억원`;
  return `${withThousands(rest)}만원`;
}

/** 원 단위 금액을 억/만원으로 요약. 예: 245000000 -> "2억 4,500만원" */
export function formatWon(won: number): string {
  if (!Number.isFinite(won)) return "-";
  return formatManwon(Math.round(won / 10000));
}

/** 미터를 사람이 읽는 거리로. 850 -> "850m", 7250 -> "7.2km" */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "-";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** 0~1 백분위를 "상위 N%" 표기로. 0.8 -> "상위 20%" */
export function formatPercentileTop(p: number): string {
  const top = Math.max(1, Math.round((1 - p) * 100));
  return `상위 ${top}%`;
}

/** 생년월일(YYYY-MM-DD) 기준 만 나이. baseDate 미지정 시 오늘. */
export function calcKoreanAge(birthISO: string, baseDate?: Date): number | null {
  if (!birthISO) return null;
  const b = new Date(birthISO);
  if (Number.isNaN(b.getTime())) return null;
  const base = baseDate ?? new Date();
  let age = base.getFullYear() - b.getFullYear();
  const m = base.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && base.getDate() < b.getDate())) age -= 1;
  return age < 0 ? null : age;
}
