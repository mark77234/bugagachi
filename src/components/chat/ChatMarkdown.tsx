"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

/**
 * AI(assistant) 메시지 전용 Markdown 렌더러. AI 갈붕 채팅과 지도 갈붕 채팅이 함께 쓴다.
 *
 * 보안: rehype-raw 를 쓰지 않으므로 원시 HTML 은 실행되지 않고 글자 그대로 보인다.
 * react-markdown 기본 urlTransform(javascript: 등 위험한 스킴 제거)을 덮어쓰지 않는다.
 * 사용자가 입력한 메시지에는 쓰지 않는다 — 말풍선에서 일반 텍스트로 그린다.
 *
 * 스타일은 전역 CSS 대신 요소별 Tailwind 클래스로만 준다 (말풍선 밖에 영향 없음).
 */

/** 말풍선 안이라 제목을 페이지 제목만큼 키우지 않고, 문서 개요상 h2 아래로 눕힌다. */
const HEADING = "mt-3 font-bold text-navy first:mt-0";
/** 블록 요소 공통 상단 여백. 말풍선 안에서 과하지 않게 좁게 잡는다. */
const BLOCK = "mt-2 first:mt-0";

const COMPONENTS: Components = {
  h1: ({ children }) => <h4 className={`${HEADING} text-base font-extrabold`}>{children}</h4>,
  h2: ({ children }) => <h5 className={`${HEADING} text-[0.9375rem]`}>{children}</h5>,
  h3: ({ children }) => <h6 className={`${HEADING} text-sm`}>{children}</h6>,
  h4: ({ children }) => <h6 className={`${HEADING} text-sm`}>{children}</h6>,
  h5: ({ children }) => <h6 className={`${HEADING} text-sm`}>{children}</h6>,
  h6: ({ children }) => <h6 className={`${HEADING} text-sm`}>{children}</h6>,

  p: ({ children }) => <p className={BLOCK}>{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-navy">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  ul: ({ children }) => <ul className={`${BLOCK} list-disc pl-5 marker:text-muted`}>{children}</ul>,
  ol: ({ children }) => <ol className={`${BLOCK} list-decimal pl-5 marker:text-muted`}>{children}</ol>,
  // 중첩 목록은 부모 li 바로 아래에 붙으므로 여백을 더 좁힌다.
  li: ({ children }) => <li className="mt-1 [&>ol]:mt-1 [&>ul]:mt-1">{children}</li>,

  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary underline underline-offset-2 [overflow-wrap:anywhere] hover:text-primary-hover"
    >
      {children}
    </a>
  ),

  blockquote: ({ children }) => (
    <blockquote className={`${BLOCK} border-l-2 border-border-strong pl-3 text-muted`}>{children}</blockquote>
  ),

  // react-markdown v10 은 inline 여부를 넘겨주지 않는다.
  // 인라인 기준으로 스타일을 주고, 코드블록일 때는 아래 pre 에서 되돌린다.
  code: ({ children }) => (
    <code className="rounded border border-border/70 bg-surface px-1 py-0.5 font-mono text-[0.85em] [overflow-wrap:anywhere]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre
      className={`${BLOCK} overflow-x-auto rounded-[var(--radius-input)] border border-border bg-surface p-3 text-xs leading-relaxed [&>code]:whitespace-pre [&>code]:rounded-none [&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:[overflow-wrap:normal]`}
    >
      {children}
    </pre>
  ),

  // 표가 넘칠 때 말풍선 안에서만 가로 스크롤되게 감싼다 (화면 전체가 밀리지 않도록).
  table: ({ children }) => (
    <div className={`${BLOCK} overflow-x-auto rounded-[var(--radius-input)] border border-border`}>
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface">{children}</thead>,
  th: ({ children }) => (
    <th className="whitespace-nowrap border-b border-border px-2.5 py-1.5 text-left font-bold text-navy">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="whitespace-nowrap border-b border-border/60 px-2.5 py-1.5">{children}</td>
  ),

  hr: () => <hr className="my-3 border-border" />,
};

export function ChatMarkdown({ content }: { content: string }) {
  if (!content.trim()) return null;
  return (
    // 긴 URL·긴 단어가 말풍선을 뚫지 않도록 컨테이너에서 한 번 더 막는다.
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
