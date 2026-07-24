# INFORMATION ARCHITECTURE — 부가가치

## 1. 목적
전체 페이지·라우트·네비게이션·상태 소유권을 정의하고, 자격 규칙과 UI가 결합되지 않도록 폴더 구조를 확정한다.

## 2. 라우트 맵 (Next.js App Router)

```
app/
  (marketing)/
    page.tsx                      B1 랜딩
  (flow)/
    eligibility/
      layout.tsx                  1단계 셸(스테퍼 + 입력요약 사이드바)
      common/page.tsx             1-1 (스텝 A/B/C/D, 내부 step state)
      result/page.tsx             1-1 중간 결과
      detail/page.tsx             1-2 유형별 세부(후보 유형만 렌더)
      summary/page.tsx            1단계 완료 결과 / 종료 화면
    survey/
      layout.tsx                  2단계 셸
      intro/page.tsx              2단계 진입 안내
      budget/page.tsx             Q0 예산(하드필터)
      region/page.tsx             Q1 지역(하드필터)
      steps/page.tsx              Q2~Q6(내부 step state)
      analyzing/page.tsx          추천 분석 중
  (app)/
    results/page.tsx              B4 리스트 + 지도
    housing/[id]/page.tsx         B5 상세
    community/
      page.tsx                    B6 목록(지역/유형 게시판·인기·최신·검색)
      [postId]/page.tsx           글 상세
      write/page.tsx              글쓰기 mock
    my/page.tsx                   B7 마이페이지
```

라우트 그룹: `(marketing)`=정적 랜딩, `(flow)`=설문 셸(진행 스테퍼·이탈 방지), `(app)`=결과·커뮤니티·마이(공통 앱 헤더).

## 3. 소스 폴더 구조 (요구된 계층)

```
src/
  domain/            # 순수 타입·enum·상수 정의 (로직 없음)
    eligibility.ts   # EligibilityTypeCode, 입력/결과 타입
    preference.ts    # 2단계 설문 타입
    housing.ts       # HousingUnit, RentalCondition 등
    scoring.ts       # CategoryScore, RecommendationScore 등
  config/
    eligibility-config.2026.ts   # 1-1/1-2 기준 마스터(문서 원문)
    eligibility-config.2025.ts   # 재개발 전용 2025 기준
    scoring-config.ts            # 가중치·계단 breakpoints·우회계수·Q6 임시경계
  services/
    eligibility/     # stage1_1(), stage1_2() 순수함수(규칙 엔진)
    geo/             # geocoder(adapter), distance(haversine), detour(×1.291)
    facilities/      # 시설 최근접 조회(현재 mock loader)
    recommendation/  # 하드필터 → 축점수 → 가중합 → reasons
    percentile/      # Q5 백분위 사전계산 테이블 조회
  mocks/             # mock 주택/시설/커뮤니티/백분위 분포 데이터
  features/          # 화면 단위 기능(폼 스텝, 결과, 지도 등) — services 소비만
  components/        # 순수 UI(shadcn 래핑, 스테퍼, 요약 사이드바, 세그먼트 버튼)
  store/             # zustand (persist) 전역 상태
```

**결합 금지 규칙:** `features`/`components`는 `config`의 숫자를 직접 참조하지 않고 `services` 함수 결과만 소비한다. 규칙 변경은 `config`만 수정하면 전 화면에 반영된다.

## 4. 전역 상태 소유권 (zustand, persist)

| 스토어 | 소유 데이터 | 저장 |
|--------|-------------|------|
| `eligibilityStore` | 공통입력·세부입력·유형별결과·현재스텝 | localStorage |
| `surveyStore` | 예산·지역·Q2~Q6 입력·건너뛴 축 | localStorage |
| `resultStore` | 후보 주택·추천 결과·정렬/필터 상태 | 세션(재계산 가능) |
| `userStore` | 저장/최근 주택·알림설정·GUEST 여부 | localStorage |

## 5. 네비게이션 규칙
- 헤더: 로고(부가가치) · 자격확인 · 추천결과 · 커뮤니티 · 마이. 모바일은 하단 탭 또는 햄버거.
- 진행 중 이탈 시 "입력 내용이 저장됩니다" 안내(자동 persist).
- 2단계는 1단계 `STAGE1_DONE` && 후보≥1 일 때만 진입 가능(가드).
- 상시 배너: "추천은 자격 확정이 아니에요 · 실제 신청은 모집공고 확인 필요".

## 6. 데이터 입출력
- 입력 → `store` → `services` → 결과 `store`. 페이지는 store 구독만.
- CSV/XLS 원본은 현재 미파싱. `mocks/`가 동일 타입으로 대체하며, 실제 데이터 진입 위치는 `services/facilities` loader.

## 7. 예외/접근성/개인정보/백엔드/완료조건
- 예외: 라우트 가드 실패 시 적절한 상위 스텝으로 리다이렉트(빈 상태 방지).
- 접근성: 스킵 링크, 스테퍼 `aria-current`, 지도 대체 리스트 뷰.
- 개인정보: 민감 입력은 store(persist)만, 서버 전송 없음. 삭제 액션은 `userStore.clearAll()`.
- 백엔드 연동: 각 `services/*`가 교체 지점. 라우트/스토어는 불변.
- 완료조건: 위 라우트·폴더·스토어가 생성되고 결합 금지 규칙이 lint 수준으로 지켜짐.
