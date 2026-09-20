<div align="center">

# 부가가치

### 부산 공공임대주택 맞춤 추천 서비스

자격 · 예산 · 지역 · 생활환경을 기반으로  
사용자에게 적합한 부산 공공임대주택을 찾아주는 웹 서비스입니다.

**🥉 DIVE 2026 부산도시공사 발제사 3위**

[서비스 바로가기](https://bugagachi.vercel.app/) ·
[Portfolio](https://mark77234.github.io/portfolio/)

</div>

---

## 프로젝트

- **기간**: 2026.07.25 ~ 2026.07.26
- **팀**: 데이터 분석 3명 · 개발 1명
- **역할**: 서비스 개발 단독 담당

공공임대 정보를 단순 조회하는 것을 넘어,

**자격 확인 → 예산·지역 필터링 → 생활환경 분석 → 주택 추천 → 지도 확인**

까지 하나의 흐름으로 구현했습니다.

---

## 로컬 실행

```bash
cp .env.example .env.local   # 값을 채운 뒤 실행
npm install && npm run dev
```

### 환경변수

| 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | Kakao Maps JavaScript 키. 지도와 장소 검색(`services.Places`)이 함께 사용합니다. |
| `AI_BASE_URL` · `AI_MODEL` · `AI_API_KEY` | AI 갈붕이 챗봇 (서버 전용) |

`NEXT_PUBLIC_KAKAO_MAP_KEY`는 브라우저에 노출되는 공개 식별 키입니다.
키 자체를 숨길 수는 없으므로, **Kakao Developers > 내 애플리케이션 > 앱 설정 > 플랫폼 > Web**에
사용 도메인을 등록해 다른 도메인에서의 사용을 막아야 합니다.

```text
http://localhost:3000        # 로컬 개발
https://bugagachi.vercel.app # 운영
```

Vercel Preview 배포에서도 지도를 쓰려면 해당 프리뷰 도메인도 함께 등록해야 합니다.
등록되지 않은 도메인에서는 SDK 로드가 실패해 지도와 장소 검색이 모두 동작하지 않습니다.

---

## 주요 기능

- 공공임대 유형별 **신청 가능 여부 판정**
- 보증금 · 월세 · 희망 지역 기반 **후보 필터링**
- 직장/학교 거리와 주변 생활 인프라 기반 **추천 점수 계산**
- Kakao Maps 기반 추천 주택 시각화
- 실제 서비스 주택 데이터와 연결된 **LLM 챗봇**

> 주택 추천 자체는 LLM이 아닌  
> **Rule Engine + Filter + Weighted Scoring** 방식으로 처리합니다.

---

## 데이터

공공임대 원본 데이터 **84,002행**을 활용해 서비스를 구성했습니다.

- 355개 건물
- 9,022개 물리 호실
- 930개 임대 가격 조건
- 상가·생활업종 161,449건
- 병원 · 마트 · 공원 · 철도역 · 학교 · 어린이집 등 생활 인프라 데이터

---

## Tech Stack

`Next.js 16` `React 19` `TypeScript` `Tailwind CSS`

`Zustand` `Kakao Maps` `Vercel`

`Upstage Solar Pro 2` `OpenAI SDK`

---

## Engineering

### 공공임대 데이터를 사용자에게 보여줄 수 있는 단위로

원본 데이터에서는 동일한 주택이 소득구간 · 가구원 수 · 가격 조건에 따라 반복됩니다.

이를 그대로 보여주는 대신  
**건물 · 호실 · 가격 조건을 구분한 구조**를 서비스에 적용해  
사용자가 355개 건물을 중심으로 탐색할 수 있도록 구성했습니다.

### 16만 건 생활 데이터의 좌표 문제

상가 데이터의 `lon`, `lat` 값이 일반 위경도가 아닌  
**EPSG:5181 평면좌표**라는 문제를 확인했습니다.

좌표계를 변환한 뒤 거리 계산에 적용해  
생활 인프라 데이터를 추천 점수에 활용했습니다.

### LLM은 추천 결과를 만들지 않도록

LLM이 임의의 주택을 생성하지 않도록  
서비스에 존재하는 **주택 ID를 반환하도록 제한**했습니다.

반환된 ID를 실제 주택 카드와 Kakao Maps 마커에 연결했습니다.

---

## Result

- **DIVE 2026 부산도시공사 발제사 3위**
- Vercel Production 배포
- 부산도시공사로부터 **청약센터 게시 및 시민 설문 기반 시범 운영 제안**

---

<div align="center">

[Live Demo](https://bugagachi.vercel.app/) ·
[Portfolio](https://mark77234.github.io/portfolio/) ·
[Resume](https://mark77234.github.io/resume/)

</div>
