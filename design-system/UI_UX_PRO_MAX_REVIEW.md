# UI/UX Pro Max — 적용 리뷰

`ui-ux-pro-max` 스킬(nextlevelbuilder, v2.11.0)을 `.claude/skills/`에 설치하고, 부가가치 제품 맥락으로 실행한 결과와 적용 내역.

## 실행 쿼리
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "public service government housing eligibility multi-step form korean accessible" \
  --design-system -p "부가가치"
```

## 스킬 권장 결과 (요약)
- **Pattern**: Funnel (3-Step Conversion) — 단계별 진행 표시 + progressive disclosure. → 우리 1·2단계 스텝 플로우와 일치.
- **Style**: **Accessible & Ethical** (Government/public 전용) — WCAG AAA, 16px+, 키보드 내비, 포커스, 시맨틱. → 우리 방향과 정확히 일치.
- **Colors**: 고대비 navy(#0F172A) + blue accent(#0369A1) 제안. → 우리는 **레퍼런스 이미지 기반 teal(#0f766e)** 를 브랜드로 유지(사용자 확정색). navy는 텍스트(`--color-navy`)로 이미 사용 중.
- **Typography**: Noto Sans KR 권장. → 우리 폰트 스택에 이미 `Noto Sans KR` fallback 포함. 성능(CRITICAL) 위해 시스템/Pretendard 우선 유지(무거운 웹폰트 로드 회피 = 스킬의 Performance 원칙과 부합).
- **Effects**: 포커스 링 3–4px, ARIA, skip link, reduced-motion, 44×44 터치.
- **Avoid**: 과장 장식, 저대비, 과한 모션, **AI purple/pink 그라데이션** → 우리 금지색과 동일.

## 적용한 변경 (checklist 갭 보완)
1. **cursor-pointer 전역 복원** — Tailwind v4 preflight가 버튼에 pointer를 더 이상 넣지 않는 문제를 `globals.css` base에서 보완(button/[role=button]/label(radio·checkbox)/summary). 체크리스트 "cursor-pointer on all clickable" 충족.
2. **포커스 링 2px → 3px** — Accessible & Ethical 스펙(3–4px)에 맞춰 상향.
3. 스킬을 `.claude/skills/`에 설치(로컬 Claude Code에서 `/ui-ux-pro-max` 등 사용 가능). 벤더 데이터(~8MB)는 `.gitignore`로 저장소·배포에서 제외.

## 이미 충족(변경 불필요)로 검증된 항목
SVG 아이콘(Lucide)·이모지 금지, hover 150–300ms 트랜지션, 대비 4.5:1, 키보드 포커스, prefers-reduced-motion, 375/768/1024/1440 반응형, 시맨틱 라디오/체크박스, 상태 색+아이콘+텍스트 3중 표기.

## 재사용
다음 세션에서 페이지 설계·리뷰 시:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux   # UX 가이드라인
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain color # 팔레트
```
