/**
 * 상세 페이지 지도 핀에 쓸 업종별 lucide 아이콘을 SVG 마크업으로 미리 뽑는다.
 *
 * 카카오 CustomOverlay 의 content 는 React 엘리먼트가 아니라 DOM 노드라서 마크업이 필요하다.
 * 런타임에 React 로 렌더하려면 flushSync/react-dom-server 가 필요해 제약과 번들 비용이 생기므로,
 * 종류가 21개로 고정인 점을 이용해 빌드 시점에 문자열로 구워둔다.
 *
 * 실행: node scripts/build-infra-glyphs.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** key(`{tier}:{category}`) → lucide 아이콘 이름. NearbyInfraSection 의 아이콘 표와 일치해야 한다. */
const ICONS = {
  "required:HOSPITAL": "Hospital",
  "required:MART": "ShoppingCart",
  "required:PARK": "Trees",
  "required:LIBRARY": "BookOpen",
  "required:SPORTS": "Dumbbell",
  "required:SUBWAY": "Train",

  "education:DAYCARE": "Baby",
  "education:KINDER": "Baby",
  "education:ELEM": "School",
  "education:MIDDLE": "School",
  "education:HIGH": "GraduationCap",

  "preference:식당": "UtensilsCrossed",
  "preference:뷰티": "Scissors",
  "preference:카페": "Coffee",
  "preference:편의점/슈퍼마켓": "ShoppingBasket",
  "preference:운동/스포츠": "Dumbbell",
  "preference:베이커리": "Croissant",
  "preference:치킨": "Drumstick",
  "preference:주점": "Beer",
  "preference:입시/예체능 학원": "PencilRuler",
  "preference:독서실/스터디카페": "Library",
};

const entries = [];
for (const [key, iconName] of Object.entries(ICONS)) {
  const Icon = Lucide[iconName];
  if (!Icon) throw new Error(`lucide-react 에 '${iconName}' 아이콘이 없어요 (key=${key})`);
  const markup = renderToStaticMarkup(createElement(Icon, { width: 14, height: 14, strokeWidth: 2.5 }));
  entries.push([key, markup]);
}

const body = entries.map(([key, markup]) => `  ${JSON.stringify(key)}: ${JSON.stringify(markup)},`).join("\n");

const file = `/** 자동 생성 — 수정하지 마세요. \`node scripts/build-infra-glyphs.mjs\` 로 다시 만듭니다.
 *
 *  상세 페이지 주변환경 지도의 인프라 핀에 쓰는 업종별 아이콘 SVG 마크업.
 *  (지도 탭은 기존 전용 핀 이미지를 그대로 쓴다) */
export const INFRA_GLYPH_MARKUP: Record<string, string> = {
${body}
};
`;

const target = join(ROOT, "src/components/map/infra-glyph-markup.ts");
writeFileSync(target, file);
console.log(`완료 → src/components/map/infra-glyph-markup.ts (${entries.length}종, ${(file.length / 1024).toFixed(1)}KB)`);
