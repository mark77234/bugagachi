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
    return nextResolve(specifier, context);
  },
});
