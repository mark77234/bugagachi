# Q0~Q6 점수 산출 코드 작성 가이드 (최종)

부산 공공임대주택 추천 서비스의 점수 산출 코드를 작성하기 위한 확정 명세.
모든 수치·규칙은 팀 확정값이다. 임의 변경 금지 — 변경이 필요해 보이면 TODO 주석을 남기고 확정값대로 구현한다.

---

## 1. 아키텍처

**전처리 1회 + 런타임 조회**로 분리한다.

```
[전처리 precompute.py]  주택 + 시설마스터 + 상가(CHIP/LOUD)
    → 주택별 거리·점수·백분위 전부 계산 → scores.csv 저장

[런타임 rank.py]  scores.csv + 사용자 응답
    → Q0·Q1 필터 → Q2 앵커·Q6 t 계산 → 축 집계 → 가중합 → 정렬
```

런타임에서 거리 재계산·백분위 재계산은 **절대 금지**. 사용자 입력에 의존하는 것은 Q2 앵커 거리와 Q6의 t 두 가지뿐이다.

---

## 2. 공통 규칙

**좌표계.** 모든 거리 계산은 EPSG:5186. 위경도로 직접 유클리드 거리 계산 금지.

```python
from pyproj import Transformer
TF = Transformer.from_crs("EPSG:4326", "EPSG:5186", always_xy=True)
x, y = TF.transform(df['lon'].values, df['lat'].values)   # ★ (경도, 위도) 순서 주의
```

**거리 보정.** 직선거리 × **1.291** (부산 실측 우회계수, 김태곤 외 2013). 모든 거리축에 적용.

**점수 변환.** 매듭 + 선형보간(`np.interp`). 계단함수 금지. 최상·최하 구간은 평탄(포화).

```python
def knot_score(dist_m, knots, values):
    return np.interp(dist_m, [0] + list(knots), [values[0]] + list(values))
```

**백분위.** 항상 **위치(건물) 단위** — 키는 `road_address_clean`. 같은 주소의 호실은 같은 값. 호실 단위로 하면 대형 건물이 분포를 점유해 '동네 밀도'가 아닌 '단지 규모'를 재게 된다.

```python
def pct_by_location(values, loc_keys):
    s = pd.Series(values, index=loc_keys)
    rank = s.groupby(level=0).first().rank(method='average', pct=True)
    return s.index.map(rank).values
```

**0건 = 실제 부재 = 0점.** 반경 내 대상이 없으면 데이터 누락이 아니라 실제로 없는 것이므로 최하위(백분위 최저 또는 매듭 0점)로 정상 반영한다. **축 제외는 "사용자가 응답하지 않은 축"에만** 발생한다. `fillna`로 임의 보정하지 않는다.

전제: 상가데이터와 주택데이터는 동일 범위(부산 전역 또는 동일 구)로 제공된다. 범위가 어긋난 조합을 쓰게 되면 이 전제가 깨지므로 그때만 모집단 한정을 재검토한다.

---

## 3. 입력 데이터

| 파일 | 규모 | 핵심 컬럼 | 주의 |
|---|---|---|---|
| 주택 마스터 | 호실 단위, 41컬럼(snake_case) | deposit_krw, rent_krw, district, **road_address_clean**, lat, lon | 위경도 = WGS84. **위치 키 = road_address_clean** |
| 상가 CSV (칩 매핑 완료) | 161,449건 | CMSC_S_NM, **CHIP**, **LOUD**, lon, lat | ★lon/lat 컬럼이 사실은 **EPSG:5181 미터 좌표**. WGS84 아님. 5181→5186 변환 후 사용 |
| 종합병원 | 31 | 위도, 경도 | |
| 도서관 | 50 | 위도, 경도 | 시립14+구군립36, 작은도서관 제외 |
| 대형마트 | 77 | 위도, 경도 | 시장·SSM 제외 |
| 공원 | 210 | 위도, 경도, **공원면적(m)** | 면적은 원주거리 특례에 사용 |
| 생활체육시설 | 213 | 위도, 경도 | 특수 21종 제외본 |
| 철도역 | 136 | 위도, 경도 | 환승역은 노선별 1행 (최근접에 유리, 정상) |
| 어린이집 | 1,216 | 위도, 경도 | 정상+재개, 오좌표 9건 교정본 |
| 학교 | 981 | 위도, 경도, 학교급 구분 열 | 유치원/초/중/고 구분에 사용 |

**CHIP 확정 10종(한글 그대로 사용):** 식당 · 뷰티 · 카페 · 편의점/슈퍼마켓 · 운동/스포츠 · 베이커리 · 치킨 · 주점 · 입시/예체능 학원 · 독서실/스터디카페. 빈 문자열 = 칩 아님.
**LOUD:** 1 = 소음업종(요리주점·일반유흥주점·무도유흥주점·노래방·기타오락장·전자게임장), 0 = 그 외.

**주택 마스터 스키마(41컬럼, snake_case).** 점수 로직이 직접 쓰는 컬럼만 발췌:

| 용도 | 컬럼 |
|---|---|
| Q0 필터 | `deposit_krw`, `rent_krw` |
| Q1 필터 | `district` |
| 좌표 | `lat`, `lon` (WGS84) → 전처리에서 5186으로 투영해 캐시 |
| **위치(건물) 키** | **`road_address_clean`** — 백분위·건물 접기의 단위. `complex_name`은 여러 건물을 묶을 수 있어 키로 쓰지 않는다 |
| 결과화면 | `complex_name_display`, `unit_no`, `building_no`, `area_exclusive_m2`, `notice_url`, `apply_portal` 등 |
| 점수 불개입 | `eligibility_summary`, `supply_class`, `income_bracket` 등 자격 관련 열 — 자격 판정은 점수 로직 밖 |

```python
# 상가 좌표 처리 (필수)
T51 = Transformer.from_crs("EPSG:5181", "EPSG:5186", always_xy=True)
store_x, store_y = T51.transform(store['lon'].values, store['lat'].values)
```

---

## 4. Q0. 예산 — 하드 필터 (점수 없음)

입력: 보증금 상한·월세 상한(각각 선택).

```python
if max_deposit is not None: df = df[df['deposit_krw'] <= max_deposit]
if max_rent    is not None: df = df[df['rent_krw'] <= max_rent]
```

- 점수화 금지(예산 밖 주택이 상위 노출되면 모순).

## 5. Q1. 희망 구·군 — 하드 필터 (점수 없음)

```python
if selected_districts:               # "상관없어요" = 빈 리스트 → 필터 생략
    df = df[df['district'].isin(selected_districts)]
```

지역 선택 = 범위 선언. 이후 어떤 축에도 추가 거리 하드컷 금지 — 원거리는 매듭 0점 감쇠로 자연 처리.

## 6. Q2. 직장/학교 앵커 — 가중치 0.30 (런타임)

입력: 앵커 위경도(지오코딩은 외부에서 완료 가정). 미입력 시 축 제외.

| 매듭 | 5km | 10km | 30km |
|---|---|---|---|
| 점수 | 1.0 | 0.7 | 0 |

```python
ax, ay = TF.transform(anchor_lon, anchor_lat)
dist = np.hypot(hx - ax, hy - ay) * 1.291        # hx,hy = 주택 5186 좌표(전처리 캐시)
S_anchor = np.interp(dist, [0, 5000, 10000, 30000], [1.0, 1.0, 0.7, 0.0])
```

근거(주석): 통계청 「2024 통근 근로자 이동특성 분석」 4구간 경계값(5·10·30km)을 그대로 매듭으로. 30km 초과 = 0점 평탄. 결과화면에 거리와 "장거리 통근 구간" 안내 병기.

## 7. Q3. 필수 인프라 — 가중치 0.25 (전처리)

입력: 6종 복수선택 → 선택 항목 점수의 **동일가중 평균**. 무선택 시 축 제외.

| 항목 | 스케일 | 매듭 (1.0/0.6/0.2/0) |
|---|---|---|
| 병원(종합병원), 도서관 | 차량 | 5 / 10 / 15 / 20 km |
| 대형마트, 생활체육시설, 지하철역 | 도보 | 750m / 1.5 / 3 / 6 km |
| 공원 | 도보 + **원주거리 특례** | 750m / 1.5 / 3 / 6 km |

**하한선 페널티 없음**(×0.5 폐기 확정).

**공원 원주거리 특례.** 공원은 경계 도달 시점부터 이용이 시작되므로, 중심점이 아니라 **등가원 원주까지의 거리**를 보정 전 거리로 쓴다. 등가반경 r = √(면적/π), 거리 = max(중심거리 − r, 0), 공원 내부 = 0m. 대형 공원(중앙공원 r≈1,058m)이 대표점 하나로 과소평가되는 왜곡을 면적만으로 교정하는 근사.

```python
r = np.sqrt(park['공원면적(m)'].values / np.pi)
D = distance_matrix(house_xy, park_xy)                 # 5186
d_park = np.maximum(D - r[None, :], 0).min(axis=1)
park_score = knot_score(d_park * 1.291, [750,1500,3000,6000], [1.0,0.6,0.2,0.0])
```

★구현 주의: 원주 기준에서는 최근접 공원이 중심점 기준과 달라질 수 있으므로 **cKDTree 단일 query 금지** — 전 공원 거리행렬에서 (중심거리 − r) 최소값. 공원 210개라 전처리에서 충분히 계산 가능. 이 특례는 공원 전용, 나머지 5개 시설은 점 좌표 + cKDTree 최근접.

## 8. Q4. 돌봄·교육 — 가중치 0.20 (전처리)

입력: "필요하세요?" 예 → 5종 복수선택 → 동일가중 평균. 아니오/무선택 시 축 제외.

| 항목 | 매듭 (1.0/0.6/0.2/0) |
|---|---|
| 어린이집 | **375m** / 750m / 1.5km / 3km |
| 유치원·초·중·고 | 750m / 1.5km / 3km / 6km |

학교 마스터의 학교급 구분 열로 유치원/초등학교/중학교/고등학교를 나눠 각각 최근접 계산한다.

## 9. Q5. 취향 가게 — 가중치 0.15 (전처리)

입력: 칩 10종 복수선택(개수 상한 없음) → 선택 칩 점수의 동일가중 평균. 무선택 시 축 제외.

전처리:
1. 상가를 5181→5186 변환, cKDTree 구축
2. 각 주택 반경 **750m** 내 `CHIP == 칩명` 개수 → `{칩}_cnt`
3. 위치 단위 백분위 → `{칩}_score` (모집단 = 전처리 대상 전 주택)
4. 0건 위치는 최하위 백분위로 자연 반영(실제 부재 = 0점 취급). 별도 제외 없음

```python
tree = cKDTree(store_xy_5186)
idx = tree.query_ball_point(house_xy_5186, r=750)
for chip in CHIPS:                                   # 한글 10종
    mask = (store['CHIP'] == chip).values
    cnt = np.array([int(mask[i].sum()) for i in idx])
    df[f'{chip}_cnt'] = cnt
    df[f'{chip}_score'] = pct_by_location(cnt, df['road_address_clean'].values)
```

## 10. Q6. 동네 분위기 — 가중치 0.10 (c·n 전처리, t 런타임)

입력: 슬라이더 t (0=조용 ~ 1=번화, **연속값**). "상관없어요" 시 축 제외.

전처리(Q5와 같은 반경 집계에서 함께):
- `store_total` = 반경 750m 내 **전 업종** 상가 수 (칩 매핑 무관)
- `noise_store` = 반경 내 `LOUD == 1` 수
- `noise_ratio` = noise_store ÷ store_total (**분모 = 전체가게수**, 0이면 0)
- `bustle_pct`(c) = store_total의 위치 단위 백분위
- `noise_pct`(n) = noise_ratio의 위치 단위 백분위

런타임:
```python
c, n = df['bustle_pct'].values, df['noise_pct'].values
S_vibe = (1 - np.abs(c - t) / max(t, 1 - t)) * (1 - 0.5 * n * (1 - t))
```

수식 해설(주석): 앞 항 = t에 꼭짓점을 둔 삼각형(선호 일치도), max(t,1−t)는 어떤 t에서도 최악=0 정규화. 뒤 항 = 소음 감점, (1−t) 결합으로 번화 선호일수록 자동 약화, t=1이면 소멸. 0.5 = 감점 상한 캡.

검증된 성질: 연속 t 전 구간 S∈[0,1], 불연속 없음. **t=0.5가 가장 가혹**(양 극단 동시 0점).

## 11. 총점 — 축 제외 + 재정규화

```python
W = {'anchor': 0.30, 'infra': 0.25, 'care': 0.20, 'shop': 0.15, 'vibe': 0.10}
axes = {k: v for k, v in candidate_axes.items() if v is not None}   # 응답 있는 축만
tot = sum(W[k] for k in axes)
df['total_score'] = sum(axes[k] * W[k] / tot for k in axes)
df = df.sort_values('total_score', ascending=False)
```

- 남은 가중치 합=1 재정규화. 어떤 응답 조합에서도 만점 1.0.
- 축 제외는 사용자 응답 기준으로만. 데이터 0건은 이미 0점으로 반영돼 있어 행 단위 특수 처리 없음.

## 12. 출력 요건

총점 외 필수 반환: 축별 점수, **최약점 축**, 축별 근거 수치(앵커 km, 최근접 시설 거리, 칩별 개수·백분위 "카페 37곳 · 상위 9%", 분위기 일치율). 후보군 내 특정 축 분산 ≈ 0이면 "이 지역은 ○○이 비슷해 순위는 △△에서 갈림" 플래그. 결과 목록은 동일 건물 호실이 연속될 수 있으므로 건물 단위 접기 고려.

## 13. 하지 말 것

1. **위경도 직접 거리 계산 금지** — 5186 투영 후 계산.
2. **런타임 백분위 재계산 금지** — 백분위는 전처리에서 확정된 주택 고유 속성. 후보군 기준 재계산 시 같은 주택 점수가 검색 조건마다 달라진다.
3. **"0점"과 "축 제외" 혼동 금지** — 반경 내 0건은 0점(실제 부재), 축 제외는 미응답에만.
4. **계단함수 구현 금지** — 매듭은 선형보간.
5. **호실 단위 백분위 금지** — 위치 단위(`road_address_clean`).
6. **상가 lon/lat을 WGS84로 착각 금지** — 실제는 EPSG:5181 미터 좌표. 지도 표시·거리 계산 전 반드시 변환.
7. **공원을 cKDTree 단일 query로 처리 금지** — 원주거리에선 최근접이 바뀐다. 거리행렬 최소값.
8. **total_score를 사용자 간 비교에 사용 금지** — 축 구성이 응답마다 달라 절대 비교 불가. 동일 응답 내 상대 순위 전용.
9. **pyproj 인자 순서** — `always_xy=True`는 (lon, lat) 순. 마스터 컬럼 순서(lat, lon)와 반대이니 넘길 때 주의.
