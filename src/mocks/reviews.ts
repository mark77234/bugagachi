export type ReviewTag = "교통" | "소음" | "편의시설" | "관리상태";

export interface Review {
  id: string;
  housingId: string;
  rating: number; // 1~5
  tags: ReviewTag[];
  body: string;
  author: string;
  createdAt: string;
}

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r-1",
    housingId: "h-001",
    rating: 4,
    tags: ["교통", "편의시설"],
    body: "서면역과 가까워 출퇴근이 편했어요. 주변에 마트와 병원이 많습니다.",
    author: "입주 2년차",
    createdAt: "2026-06-12",
  },
  {
    id: "r-2",
    housingId: "h-001",
    rating: 3,
    tags: ["소음"],
    body: "대로변이라 낮에는 소음이 조금 있는 편이에요. 방음창은 잘 되어 있습니다.",
    author: "직장인",
    createdAt: "2026-05-30",
  },
  {
    id: "r-3",
    housingId: "h-002",
    rating: 5,
    tags: ["편의시설", "관리상태"],
    body: "단지 관리가 깔끔하고 주변 생활 인프라가 훌륭합니다.",
    author: "신혼부부",
    createdAt: "2026-06-01",
  },
  {
    id: "r-4",
    housingId: "h-003",
    rating: 4,
    tags: ["교통", "관리상태"],
    body: "청년 대상이라 비슷한 또래가 많고 관리사무소 대응이 빨라요.",
    author: "사회초년생",
    createdAt: "2026-06-20",
  },
];

export const reviewsByHousing = (id: string) => MOCK_REVIEWS.filter((r) => r.housingId === id);
