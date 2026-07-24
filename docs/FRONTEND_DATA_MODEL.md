# FRONTEND DATA MODEL — 부가가치

> 목적: 자격/추천 로직과 UI가 결합되지 않도록 `domain/` 타입을 확정. 값 로직 없음(타입·enum만). 추후 백엔드 스키마(`t_rule_s1`/`t_rule_s2`/`t_income_base`)와 1:1 매핑 가능하게 설계.

## 1. Enum / 기본
```ts
type EligibilityTypeCode = 'TONGHAP' | 'HAENGBOK' | 'JAEGAEBAL' | 'MAEIP_ILBAN' | 'MAEIP_CHUNG';
type EligibilityStatus   = 'PASS' | 'FAIL' | 'NEEDS_MORE';
type IncomeStandard      = 'MEDIAN' | 'URBAN';
type CarValueBand        = 'NONE' | 'UNDER_4542' | 'OVER';       // 0 / 45,420,000 / ∞
type MemberRelation      = 'SELF' | 'SPOUSE' | 'PARENT' | 'CHILD' | 'FETUS';
type BaseYear            = 2026 | 2025;                           // 재개발=2025
type ScoreAxis           = 'frequent' | 'infra' | 'education' | 'store' | 'neighborhood';
```

## 2. 자격 입력
```ts
interface HouseholdMember { relation: MemberRelation; birthDate?: string; }

interface EligibilityCommonInput {         // 1-1
  ownSelfHouse: boolean;                    // 스텝A 본인 주택소유(게이트)
  ownMemberHouse: boolean;                  // 세대원 유주택
  hasRestriction: boolean;                  // 제한이력(계약중·불법전대4년·재당첨)
  birthDate: string;                        // 스텝B
  ageYears: number;                         // 만나이 자동계산
  members: HouseholdMember[];
  householdSize: number;                    // 자동계산(1~8 clamp)
  incomeBracketIndex: 0|1|2|3|4;            // 스텝C 월소득 5구간 선택
  incomeRepValue: number;                   // 대표값(구간 상한, 원) — 판정 입력
  assetBracketIndex: number;                // 총자산 8구간
  assetRepValue: number;                    // 대표값(원)
  carBand: CarValueBand;
  carRepValue: number;                      // 0 | 45_420_000 | Infinity
  livesInBusan: boolean;                    // 스텝D
}

interface EligibilityDetailInput {         // 1-2 (유형별, 후보만 채움)
  TONGHAP?:      { tier: '청년'|'신혼한부모'|'고령자'|'일반'; marriageMonths?: number; dualIncome?: boolean };
  HAENGBOK?:     { tier: '대학생'|'청년'|'사회초년생'|'신혼한부모'|'고령자'|'주거급여';
                   studentStatus?: '재학'|'졸업2년내'|'소득활동5년내'; marriageMonths?: number; dualIncome?: boolean };
  JAEGAEBAL?:    { childrenSince20230328: 0|1|2 };            // 2=2 이상
  MAEIP_ILBAN?:  { isRank1: boolean; childrenSince20230328: 0|1|2 };
  MAEIP_CHUNG?:  { isRank1: boolean; rank?: 2|3; parentIncome?: number; parentAsset?: number };
}
```

## 3. 자격 결과
```ts
interface EligibilityEvaluation {          // 유형 1개 판정
  status: EligibilityStatus;
  reasons: string[];                        // 코드가 붙인 사유("총자산 초과" 등)
  checkLater: string[];                     // "실제 공고에서 소득 재확인" 등
}
interface EligibilityTypeResult {
  type: EligibilityTypeCode;
  evaluation: EligibilityEvaluation;
  baseYear: BaseYear;                        // 재개발=2025 배지용
  appliedTier?: string;                      // 판정에 쓰인 계층/순위
}
```

## 4. 2단계 설문 입력
```ts
interface BudgetCondition   { maxDeposit: number; maxMonthlyRent: number; }        // 만원
interface RegionCondition   { gungus: string[]; anyRegion: boolean; }
interface FrequentDestination { id: string; label: string; address: string; coord: LatLng; }
interface InfrastructurePreference { categories: InfraCategory[]; }                // Q3
type    InfraCategory = 'HOSPITAL'|'MART'|'PARK'|'LIBRARY'|'SPORTS'|'SUBWAY';
interface EducationPreference { enabled: boolean; categories: EduCategory[]; }     // Q4
type    EduCategory = 'DAYCARE'|'KINDER'|'ELEM'|'MIDDLE'|'HIGH';
interface StorePreference   { chips: StoreChip[]; custom: string[]; }             // Q5
interface NeighborhoodPreference { mood: 'quiet'|'moderate'|'lively'; }           // Q6
interface PreferenceSurveyInput {
  budget: BudgetCondition; region: RegionCondition;
  frequent: FrequentDestination[]; infra: InfrastructurePreference;
  education: EducationPreference; store: StorePreference; neighborhood: NeighborhoodPreference;
  skipped: ScoreAxis[];                      // 건너뛴 축(재정규화용)
}
type LatLng = { lat: number; lng: number };
```

## 5. 주택 / 시설
```ts
interface RentalCondition { priorityRank?: 1|2|3; deposit: number; monthlyRent: number; } // 만원
interface HousingUnit {
  id: string; name: string; type: EligibilityTypeCode; gungu: string; coord: LatLng;
  conditions: RentalCondition[];             // 순위별 임대조건(예산 보수 필터용)
  recruitStatus: 'open'|'upcoming'|'closed';
  recruitPeriod?: { start: string; end: string };
  supplyCount?: number; exclusiveAreas?: number[]; officialUrl?: string;
}
interface FacilityDistance { category: InfraCategory|EduCategory; meters: number; boostedMeters: number; }
```

## 6. 추천 결과
```ts
interface CategoryScore { axis: ScoreAxis; score: number; raw: FacilityDistance | number | string; }
interface RecommendationScore {
  final: number;                             // 0~1 (내부용, 화면엔 정성 근거로)
  byAxis: CategoryScore[];
  normalizedWeights: Partial<Record<ScoreAxis, number>>;
}
interface RecommendationReason { axis: ScoreAxis | 'budget' | 'eligibility'; text: string; rawValue: string; }
interface HousingRecommendation {
  unit: HousingUnit;
  score: RecommendationScore;
  reasons: RecommendationReason[];
  eligibility: EligibilityTypeResult;        // 병렬 표시(혼합 아님)
  checkLater: string[];
}
```

## 7. 부가 (커뮤니티/마이)
```ts
interface Review { id: string; housingId: string; rating: number; tags: ReviewTag[]; body: string; createdAt: string; }
type ReviewTag = '교통'|'소음'|'편의시설'|'관리상태';
interface CommunityPost {
  id: string; board: 'notice'|'review'|'qna'; region?: string; type?: EligibilityTypeCode;
  title: string; body: string; likes: number; createdAt: string;
}
interface UserPreferenceProfile {
  isGuest: boolean;
  commonInput?: EligibilityCommonInput; detailInput?: EligibilityDetailInput;
  diagnosis?: EligibilityTypeResult[];
  survey?: PreferenceSurveyInput;
  savedHousingIds: string[]; recentHousingIds: string[]; watchedRecruitIds: string[];
  notifications?: { recruitOpen: boolean; savedUpdate: boolean };
}
```

## 8. 입출력 / 예외 / 접근성 / 개인정보 / 백엔드 / 완료조건
- **입출력:** 입력 타입(§2·§4) → services → 결과 타입(§3·§6).
- **예외:** 선택형 필드 미입력 시 판정 함수는 `NEEDS_MORE` 또는 검증 에러 반환(런타임 throw 금지).
- **접근성:** 타입 자체엔 없음, UI 매핑은 `SCREEN_REQUIREMENTS.md`.
- **개인정보:** 민감 필드(birthDate·income·asset·address)는 persist 대상이며 삭제 API `clearAll()`로 일괄 파기.
- **백엔드 연동:** `EligibilityCommonInput`/`DetailInput`/`TypeResult`가 서버 계약. config 마스터 표와 1:1.
- **완료조건:** 요구된 25개 타입이 전부 정의되고 services/UI가 이 타입만 사용(any 금지).
