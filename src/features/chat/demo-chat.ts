export interface DemoChatAction {
  label: string;
  href: string;
}

export interface DemoChatTopic {
  key: string;
  question: string;
  keywords: string[];
  answer: string;
  actions: DemoChatAction[];
}

export const DEMO_CHAT_TOPICS: DemoChatTopic[] = [
  {
    key: "types",
    question: "행복주택과 통합공공임대는 뭐가 다른가요?",
    keywords: ["행복주택", "통합공공임대", "임대 유형", "유형 차이"],
    answer:
      "행복주택은 청년·신혼부부·고령자 등 계층별 요건을 중심으로 확인하고, 통합공공임대는 소득·자산과 가구 특성에 따라 폭넓게 공급되는 유형이에요. 세부 대상과 기준은 공고마다 달라질 수 있으므로 먼저 자격 확인을 진행한 뒤 해당 모집공고를 확인하세요.",
    actions: [
      { label: "내 자격 확인하기", href: "/eligibility" },
      { label: "유형별 주택 지도 보기", href: "/map" },
    ],
  },
  {
    key: "documents",
    question: "공공임대 신청에 어떤 서류가 필요한가요?",
    keywords: ["서류", "준비물", "제출", "증명서"],
    answer:
      "보통 주민등록 관련 서류, 가족관계 확인 서류, 소득·자산 확인 자료가 필요하고 공급 유형에 따라 재학·재직·혼인 등을 증명하는 서류가 추가될 수 있어요. 정확한 목록과 발급 기준일은 반드시 신청하려는 공고의 제출서류 안내에서 확인해야 해요.",
    actions: [
      { label: "맞춤 추천 시작하기", href: "/eligibility" },
      { label: "주택 둘러보기", href: "/map" },
    ],
  },
  {
    key: "process",
    question: "신청 절차를 순서대로 알려주세요.",
    keywords: ["신청 절차", "순서", "어떻게 신청", "신청 방법"],
    answer:
      "일반적으로 모집공고 확인, 신청 자격과 우선순위 점검, 온라인 또는 현장 신청, 서류 제출, 소득·자산 심사, 당첨자 발표와 계약 순서로 진행돼요. 일정과 접수 방식은 공고마다 다르므로 마감일과 제출 방법을 먼저 확인하세요.",
    actions: [
      { label: "전체 주택 지도 보기", href: "/map" },
      { label: "내 조건 확인하기", href: "/eligibility" },
    ],
  },
  {
    key: "qualification",
    question: "추천 결과가 신청 자격 확정인가요?",
    keywords: ["자격 확정", "추천 결과", "신청 가능", "판정"],
    answer:
      "아니에요. 부가가치의 자격 확인과 추천은 입력한 정보와 데모 기준을 바탕으로 한 참고 결과예요. 최종 자격은 모집기관이 공고 기준과 제출 서류를 심사해 결정하므로 실제 공고를 반드시 확인해야 해요.",
    actions: [
      { label: "자격 확인 시작하기", href: "/eligibility" },
      { label: "공식 확인 전 주택 비교하기", href: "/map" },
    ],
  },
  {
    key: "recommendation",
    question: "내 조건에 맞는 집은 어떻게 추천하나요?",
    keywords: ["추천", "내 조건", "추천 이유", "생활 취향"],
    answer:
      "먼저 무주택·소득·자산 등 기본 조건으로 신청 가능성이 있는 유형을 확인해요. 그다음 예산, 희망 지역과 생활 취향을 반영해 현재 데모 주택을 정렬하고 추천 이유를 함께 보여드려요. 추천 점수는 법적 자격 판정과 별개예요.",
    actions: [
      { label: "맞춤 추천 시작하기", href: "/eligibility" },
      { label: "전체 주택 먼저 보기", href: "/map" },
    ],
  },
];

export const FALLBACK_ANSWER: Omit<DemoChatTopic, "key" | "question" | "keywords"> = {
  answer:
    "이 데모는 임대 유형, 자격 확인, 준비 서류, 신청 절차와 추천 방식에 관한 기본 질문만 안내할 수 있어요. 아래 추천 질문을 선택하거나, 구체적인 자격과 공고 내용은 MyHome 등 공식 기관에서 확인해 주세요.",
  actions: [
    { label: "맞춤 추천 시작하기", href: "/eligibility" },
    { label: "전체 주택 지도 보기", href: "/map" },
  ],
};

export function findDemoChatTopic(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    DEMO_CHAT_TOPICS.find(
      (topic) =>
        topic.question.toLowerCase() === normalized ||
        topic.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
    ) ?? null
  );
}

export function demoChatTopicByKey(key: string | null) {
  return DEMO_CHAT_TOPICS.find((topic) => topic.key === key) ?? null;
}
