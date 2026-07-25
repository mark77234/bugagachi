/**
 * 화면 예시용 이용 후기.
 *
 * 실제 입주민 후기 데이터가 없어, 주택 id를 시드로 한 결정적(deterministic) 생성기를 사용한다.
 * 같은 주택은 항상 같은 후기를 보여주고(SSR/CSR 불일치 방지), 주택마다 개수·내용이 달라진다.
 */
export type ReviewTag = "교통" | "소음" | "편의시설" | "관리상태" | "가성비" | "치안";

export interface Review {
  id: string;
  housingId: string;
  rating: number; // 1~5
  tags: ReviewTag[];
  body: string;
  author: string;
  createdAt: string;
}

/** 문자열 → 32bit 정수 해시 (FNV-1a 변형). 시드 생성용. */
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 시드 기반 결정적 난수 생성기 (mulberry32). */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AUTHORS = [
  "입주 1년차",
  "입주 2년차",
  "직장인",
  "신혼부부",
  "사회초년생",
  "청년 입주민",
  "3인 가구",
  "재계약 예정",
];

const TEMPLATES: { tags: ReviewTag[]; body: string; ratingBase: number }[] = [
  { tags: ["교통", "편의시설"], body: "지하철역까지 걸어서 다닐 수 있어 출퇴근이 편했어요. 주변에 마트와 편의점도 가까워요.", ratingBase: 4 },
  { tags: ["소음"], body: "대로변이라 낮에는 차 소리가 조금 들려요. 창문을 닫으면 크게 신경 쓰이지 않는 정도예요.", ratingBase: 3 },
  { tags: ["관리상태"], body: "복도와 주차장이 깔끔하게 관리되고 있어요. 관리사무소 연락도 잘 받아주셨어요.", ratingBase: 4 },
  { tags: ["가성비"], body: "같은 지역 원룸 시세보다 부담이 훨씬 적어요. 보증금 대비 만족도가 높습니다.", ratingBase: 5 },
  { tags: ["편의시설", "관리상태"], body: "근처에 병원과 공원이 있어 생활하기 좋아요. 건물 상태도 사진보다 괜찮았어요.", ratingBase: 4 },
  { tags: ["치안"], body: "골목이 밝고 사람이 많아 밤에도 다니기 무섭지 않았어요. 공동현관도 잘 잠깁니다.", ratingBase: 4 },
  { tags: ["교통"], body: "버스 노선이 많아 이동은 편하지만, 역까지는 조금 걸어야 해요.", ratingBase: 3 },
  { tags: ["소음", "관리상태"], body: "위층 생활 소음이 간간이 들리지만 건물 자체는 잘 관리되는 편이에요.", ratingBase: 3 },
  { tags: ["편의시설"], body: "도보권에 시장과 카페가 있어 주말에 나가기 좋아요. 배달도 대부분 들어옵니다.", ratingBase: 4 },
  { tags: ["가성비", "교통"], body: "임대료가 저렴해서 부담이 적고, 시내 접근성도 나쁘지 않아요.", ratingBase: 5 },
];

/** 최근 1년 내 임의 날짜(결정적). */
function pickDate(next: () => number): string {
  const year = 2026;
  const month = 1 + Math.floor(next() * 7); // 1~7월
  const day = 1 + Math.floor(next() * 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 주택 id로 후기 2~4개를 결정적으로 생성. */
export function reviewsByHousing(housingId: string): Review[] {
  if (!housingId) return [];
  const next = rng(hashSeed(housingId));
  const count = 2 + Math.floor(next() * 3); // 2~4개

  const pool = [...TEMPLATES];
  const reviews: Review[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const template = pool.splice(Math.floor(next() * pool.length), 1)[0];
    const delta = next() < 0.35 ? (next() < 0.5 ? -1 : 1) : 0;
    const rating = Math.min(5, Math.max(2, template.ratingBase + delta));
    reviews.push({
      id: `${housingId}-rv-${i + 1}`,
      housingId,
      rating,
      tags: template.tags,
      body: template.body,
      author: AUTHORS[Math.floor(next() * AUTHORS.length)],
      createdAt: pickDate(next),
    });
  }
  return reviews.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** 후기 평균 별점 (없으면 null). */
export function averageRating(housingId: string): number | null {
  const list = reviewsByHousing(housingId);
  if (list.length === 0) return null;
  return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
}
