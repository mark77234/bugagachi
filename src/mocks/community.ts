import type { EligibilityTypeCode } from "@/features/eligibility/eligibility.types";

export type BoardType = "qna" | "review" | "info";

export const BOARD_LABEL: Record<BoardType, string> = {
  qna: "질문",
  review: "입주 후기",
  info: "정보 공유",
};

export interface CommunityPost {
  id: string;
  board: BoardType;
  region?: string;
  type?: EligibilityTypeCode;
  title: string;
  excerpt: string;
  author: string;
  likes: number;
  comments: number;
  createdAt: string;
}

export const MOCK_POSTS: CommunityPost[] = [
  {
    id: "p-1",
    board: "info",
    region: "부산진구",
    type: "HAENGBOK",
    title: "부산진 행복주택 1단지 7월 모집 일정 정리",
    excerpt: "신청 기간과 제출 서류를 표로 정리했습니다. 마감 임박 주의하세요.",
    author: "정보지기",
    likes: 42,
    comments: 12,
    createdAt: "2026-07-11",
  },
  {
    id: "p-2",
    board: "review",
    region: "해운대구",
    type: "TONGHAP",
    title: "해운대 통합공공임대 6개월 살아본 후기",
    excerpt: "장점과 단점을 솔직하게 적어봤어요. 교통은 최고지만 주말 소음은 감안하세요.",
    author: "바다뷰",
    likes: 88,
    comments: 25,
    createdAt: "2026-06-28",
  },
  {
    id: "p-3",
    board: "qna",
    region: "동래구",
    type: "MAEIP_CHUNG",
    title: "매입임대 청년 2순위 부모 소득 합산 어떻게 계산하나요?",
    excerpt: "부모님과 따로 사는데 소득 합산 대상이 맞는지 궁금합니다.",
    author: "취준생A",
    likes: 15,
    comments: 9,
    createdAt: "2026-07-19",
  },
  {
    id: "p-4",
    board: "qna",
    region: "남구",
    type: "JAEGAEBAL",
    title: "재개발임대 자산 기준이 2025년 기준이라는데 맞나요?",
    excerpt: "2026 공고가 아직이라 헷갈립니다. 확인 부탁드려요.",
    author: "궁금이",
    likes: 21,
    comments: 7,
    createdAt: "2026-07-15",
  },
  {
    id: "p-5",
    board: "info",
    region: "사상구",
    type: "MAEIP_ILBAN",
    title: "매입임대 일반 출산가구 자산 완화 정리",
    excerpt: "자녀 수에 따라 자산·자동차 기준이 완화됩니다. 표로 정리했어요.",
    author: "두아이맘",
    likes: 33,
    comments: 5,
    createdAt: "2026-07-09",
  },
];

export const postById = (id: string) => MOCK_POSTS.find((p) => p.id === id);
