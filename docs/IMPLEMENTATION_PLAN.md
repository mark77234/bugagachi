# IMPLEMENTATION PLAN — 부가가치

> 목적: 요구된 우선순위(디자인시스템→B1→B2→B3→추천모듈→B4→B5→B7→B6)대로 단계별 구현 계획을 정의. B2·B3는 실동작, B4~B7은 mock 기반.

## 0. 사전 결정 필요 (착수 전 확인)
- `[정책 P1]` 축 제외 시 재정규화 여부 → 기본값 **재정규화**로 진행 가능 여부.
- `[정책 P2]` Q6 상권 거리 경계 → 임시 mock 값으로 진행.
- `[정책 P4]` Q2 다목적지 결합 → 평균으로 진행.
- `[불일치 C1]` 행복 사회초년생 자산(2.51억 vs 3.45억) → 기본값 **2.51억**.
- `[불일치 C2]` 통합 무주택자 계층 범위 → 기본값 **표(청년만 본인)**.
- `[정책 P8]` NEEDS_MORE 후보 유지 규칙 → 3상태(PASS/FAIL/NEEDS_MORE) 채택.

## 1. 마일스톤

### M0 — 공통 디자인 시스템 + 앱 셸
- Next.js App Router + TS + Tailwind + shadcn/ui 초기화. Motion, Lucide, RHF, Zod, zustand(persist) 설치.
- 라우트 그룹(`(marketing)/(flow)/(app)`), 헤더(모바일/데스크톱), `Stepper`·`SummarySidebar`·`SegmentedChoice`·`QuestionCard`·`DisclaimerBanner`.
- `config/` 스캐폴딩: `eligibility-config.2026.ts`·`.2025.ts`(§5 마스터 채움), `scoring-config.ts`(가중치·계단·우회계수·Q6 임시경계).
- `domain/` 타입 전체(`FRONTEND_DATA_MODEL.md`).
- 완료: 셸 렌더 + config에 문서 수치 입력 + 타입 컴파일.

### M1 — B1 랜딩
- 소개/CTA/동작과정/유형카드/기준설명/공고예시(mock)/고지/비로그인 체험.
- 완료: 정적 렌더 + "시작하기"→`/eligibility/common`.

### M2 — B2 1단계 자격 (실동작, 핵심)
- `services/eligibility`: `stage1_1`/`stage1_2`(§6 로직) 순수함수 + 단위테스트.
- RHF+Zod 폼: 스텝 A/B/C/D, 만나이·가구원수·대표값 변환, 게이트 종료, 1-1 결과, 1-2 조건부 렌더, 재개발 2025 배지.
- 완료: **§검증 케이스 통과**(27세 청년·부모유주택·자산2억 → 후보 {통합,행복,매입청년}, 1-2 매입청년 3순위 통과). 상수 하드코딩 0.

### M3 — B3 2단계 취향 (실동작)
- `services/geo`(mock geocoder + haversine + detour 1.291), `stepScore` 유틸, `services/facilities`(mock 최근접), `services/percentile`(mock 분포).
- Q0/Q1 하드필터 + 완화 제안, Q2~Q6 스텝(가중치 배지·왜묻는가·건너뛰기), Q4 게이트.
- 완료: 입력→하드필터→축 입력 수집까지 동작.

### M4 — 추천 계산 mock 모듈
- `services/recommendation`: 파이프라인(§3), 가중치 재정규화(flag), `buildReasons`(정성 근거+원본값).
- 완료: 후보 주택에 대해 정성 근거 포함 정렬 결과 산출.

### M5 — B4 리스트 + 지도 (mock)
- mock map 컴포넌트(카카오 키 없을 때), 리스트↔지도 동기화, 정렬/필터/즐겨찾기, 카드 근거.
- 완료: HAS_RESULTS/NO_RESULTS/MAP_LOADING/API_ERROR_MOCK 재현.

### M6 — B5 상세 (mock)
- 전 필드 + 항목별 점수/원본값 + 자격결과(병렬) + 확인할조건 + 공고링크 + 리뷰 태그 + 저장/공유.

### M7 — B7 마이페이지 (mock)
- 진단결과·추천조건·저장·최근·관심공고·재설문·수정·알림 UI·삭제·로그아웃 mock.

### M8 — B6 커뮤니티 (mock)
- 게시판(지역/유형)·인기/최신·검색·글쓰기 mock·신고/운영정책.

## 2. 비기능 / 접근성 / 개인정보 (전 마일스톤 공통 게이트)
- 결합 금지: 화면이 config 숫자 직접 참조 금지(services 경유).
- 접근성: 키보드 완주·aria·지도 대체 뷰 — M2/M3부터 적용.
- 개인정보: persist 저장 + `clearAll()` 삭제 — M0 store에 포함.

## 3. 백엔드 연동 포인트 (후속)
- `services/eligibility`(규칙 엔진) / `services/geo`(지오코딩·좌표) / `services/facilities`(CSV·XLS 로더) / `services/percentile` / `services/recommendation` / 인증(GUEST→실세션). 전부 adapter 뒤 교체, 화면·타입 불변.

## 4. 전체 완료 조건
1. M0~M8 완료, B2·B3 end-to-end 실동작, B4~B7 mock.
2. 자격 판정이 문서 로직과 동치(회귀 케이스 고정).
3. 전 수치 config 격리, 재개발 2025 배지.
4. 추천이 정성 근거+원본값으로 표시(벌거벗은 점수 없음).
5. 18개 화면 상태 mock 재현.
6. `[정책 P*]`·`[불일치 C*]` 항목 코드/문서 명시 및 기본값 반영.

## 5. 리스크
- CSV/XLS 좌표계·컬럼 불명 → mock로 진행, 실데이터 진입 시 loader에서 흡수.
- 카카오 키 부재 → mock map 필수.
- 문서 내부 불일치(C1~C3) 미확정 시 기본값으로 진행하되 UI에 "검토 중 기준" 표기.
