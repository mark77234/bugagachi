# 부가가치 Design System — MASTER

부산 공공임대 자격 확인 + 상권·취향 추천 서비스의 마스터 디자인 시스템.
키워드: **신뢰 · 차분 · 명확 · 따뜻한 공공서비스 · 접근 가능 · 데이터 기반 · 과장 없음**.

> 원칙: 컴포넌트 내부에 hex를 반복 하드코딩하지 않는다. 모든 색·간격·radius·shadow는 아래 토큰(`globals.css`의 CSS 변수 → Tailwind v4 `@theme`)을 통해 사용한다.

## 1. 컬러 토큰
| 역할 | 변수 | 값 | 비고 |
|---|---|---|---|
| Background | `--color-bg` | `#f6f8f7` | 민트 섞인 회백색 |
| Surface | `--color-surface` | `#ffffff` | 카드/입력 |
| Surface-muted | `--color-surface-muted` | `#eef2f1` | 보조 배경 |
| Primary | `--color-primary` | `#0f766e` | 차분한 청록(CTA·강조) |
| Primary-hover | `--color-primary-hover` | `#0e6b64` | |
| Primary-subtle | `--color-primary-subtle` | `#e6f2f0` | 선택 배경/배지 |
| Navy(Secondary) | `--color-navy` | `#1e293b` | 강조 텍스트/헤더 |
| Foreground | `--color-fg` | `#0f172a` | 본문(차콜/네이비) |
| Muted text | `--color-muted` | `#5b6b73` | 보조 텍스트(AA 확보) |
| Border | `--color-border` | `#dce3e1` | 얇은 테두리 |
| Success | `--color-success` / `-subtle` | `#15803d` / `#e7f4ec` | 통과 |
| Warning | `--color-warning` / `-subtle` | `#b45309` / `#fbf0e2` | 추가 확인 |
| Error | `--color-error` / `-subtle` | `#b91c1c` / `#fbeaea` | 제외/오류 |
| Focus ring | `--color-ring` | `#0f766e` | 2px + 2px offset |

**금지색:** 보라·분홍 AI 그라데이션. 상태는 색 단독 사용 금지 → 항상 아이콘+텍스트 병기.

## 2. 타이포그래피
- 폰트: `Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif` (빌드 네트워크 의존 회피).
- 스케일: display 32/40 · h1 26/34 · h2 21/30 · h3 18/26 · body 16/26 · small 14/22 · caption 13/18.
- 본문 최소 16px, 보조 최소 14px. 작은 회색 글씨 금지.
- 위계: 질문 제목(h2, navy, semibold) → 보조 설명(body, muted). 명확한 대비.

## 3. 스페이싱 · 형태
- radius: `--radius-card 16px`, `--radius-choice 14px`, `--radius-input 12px`, `--radius-pill 9999px`.
- 높이: 입력 48px, 주요 CTA 52px, 보조 버튼 44px, 터치 최소 44px.
- shadow: `--shadow-sm 0 1px 2px rgba(15,23,42,.05)`, `--shadow-card 0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04)`. 큰 blur 금지.
- 컨테이너: 설문 카드 720–880px, 일반 콘텐츠 max 1024px, 지도 화면은 별도 폭. 모바일 좌우 여백 16px.
- 수직 리듬: 섹션 간 32–48px, 카드 내부 20–24px.

## 4. 핵심 컴포넌트 규격
- **Button**: variant `primary|secondary|outline|ghost|danger`, size `lg(52)|md(44)|sm(36)`. focus-visible ring. whileTap 0.98.
- **ChoiceCard**: 넓은 선택 버튼. 2개=2열, 다수=반응형 그리드. `role=radio`/`aria-checked` 또는 `aria-pressed`. 선택 시 primary-subtle 배경 + primary 테두리 + 체크 아이콘(색 단독 금지).
- **Stepper**: 가로 진행. 단계 배지 A/B/C/D. 현재=primary 채움, 완료=체크, 이후=muted 외곽선. `aria-current="step"`. 모바일 축약("B / 4단계").
- **QuestionCard**: 제목 + 보조설명(`aria-describedby`) + 입력영역 + 하단 이전/다음.
- **SummarySidebar**: 우측 스티키 입력 요약(데스크톱), 모바일 상단 접이식. 미입력 `—`. 하단 "입력 정보는 자격 판정에만 사용돼요".
- **Badge**: status `pass(success)|needs(warning)|excluded(error)|info`. 아이콘 필수.
- **RangeSegment**: 소득/자산 구간 세그먼트 카드.
- **Chip**: 다중 선택(지역/시설/가게). 선택 상태 명확.
- **Banner / PrivacyNotice / EmptyState / ErrorState / LoadingState / ConfirmationDialog**: 공통.

## 5. 접근성 규칙 (전 컴포넌트 공통)
- 모든 입력 `<label>`, 그룹은 `<fieldset><legend>`. 라디오/체크 시맨틱 유지.
- visible focus(ring 2px + offset 2px), 터치 44px+.
- 상태는 색+아이콘+텍스트. 오류 영역 `aria-live="polite"`.
- 단계 변경 시 제목(`h1/h2`)으로 포커스 이동, 스크린리더 진행 안내.
- `prefers-reduced-motion` 대응(MotionConfig reducedMotion="user"). 텍스트 200% 확대 대응.

## 6. Motion 규칙
- import: `motion/react`. `AnimatePresence mode="wait"`.
- duration 180–260ms, 이동 12–24px, whileTap 0.98, hover 이동 ≤2px, 결과 stagger 40–70ms.
- 허용: 단계 전환, 진행률, 선택 피드백, 조건부 질문 등장, 결과 카드 등장, 지도↔리스트 동기화, 저장 완료, 모바일 시트.
- 금지: 페이지 전체 슬라이드, 반복 애니메이션, 패럴랙스, 텍스트 무빙, 과한 spring, 3D.

## 7. 아이콘
Lucide React만 사용. 이모지를 기능 아이콘으로 사용 금지.

## 8. 반응형 브레이크포인트
375 / 430 / 768 / 1024 / 1440 확인. 모바일 1열 + 하단 고정 CTA, 데스크톱 콘텐츠 폭 제한(설문 2단: 카드 + 요약).

## 9. 상태 표현 색 매핑
- 통과 `PASS`: success + `CheckCircle2`
- 추가 확인 `NEEDS_MORE`: warning + `AlertCircle`
- 제외 `FAIL`: error + `XCircle`
- 정보/고지: info(navy/primary) + `Info`
