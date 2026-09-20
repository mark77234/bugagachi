/**
 * node --test 용 "@/" 경로 별칭 해석기.
 *
 * tsconfig 의 paths({"@/*": ["./src/*"]})는 번들러 전용이라 node 가 모르므로,
 * 테스트에서 프로젝트와 같은 import 를 쓸 수 있게 여기서 풀어준다.
 * (Node 22.15+ 의 동기 훅 — 별도 로더 스레드 파일이 필요 없다.)
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = path.join(SRC, specifier.slice(2));
      const target = existsSync(base) ? base : `${base}.ts`;
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
    // 확장자 없는 상대 import(./foo)도 번들러 전용 표기이므로 .ts 를 붙여 풀어준다.
    // 파일명에 점이 있어도(eligibility.tiers) 동작해야 하므로 확장자 유무 대신 실제 파일로 판단한다.
    if (specifier.startsWith(".")) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      if (!existsSync(base) && existsSync(`${base}.ts`)) {
        return { url: pathToFileURL(`${base}.ts`).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
