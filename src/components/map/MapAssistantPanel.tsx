"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mascot } from "@/components/common/Mascot";
import { housingById } from "@/mocks/housing";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const REC_RE = /<<REC:([^>]*)>>/;

const HINTS = ["지하철역 가까운 집 찾아줘", "월 20만원 이하로 조용한 곳", "이 집 주변 생활환경 어때요?"];

/** 모델이 `rental-` 접두사를 빼먹어도 실제 주택 id로 맞춰준다. */
function normalizeUnitId(raw: string): string | null {
  const id = raw.trim();
  if (!id) return null;
  if (housingById(id)) return id;
  const prefixed = id.startsWith("rental-") ? null : `rental-${id}`;
  if (prefixed && housingById(prefixed)) return prefixed;
  return null;
}

function parseRec(text: string): { clean: string; ids: string[] } {
  const match = text.match(REC_RE);
  if (match) {
    const ids = match[1]
      .split(",")
      .map(normalizeUnitId)
      .filter((id): id is string => !!id);
    return { clean: text.replace(REC_RE, "").trim(), ids: [...new Set(ids)].slice(0, 3) };
  }
  return { clean: text.replace(/\n?<<?R?E?C?:?[^>]*$/, "").trimEnd(), ids: [] };
}

/**
 * 지도 위 플로팅 AI 갈붕 패널.
 * 지금 보고 있는(선택한) 마커를 대화 컨텍스트로 넘기고,
 * 답변에서 추천된 주택 id를 지도에 별도 색상 마커로 되돌려준다.
 */
export function MapAssistantPanel({
  focusedUnitId,
  onRecommend,
  onSelectUnit,
}: {
  /** 지도에서 선택된 주택 — AI에게 "지금 보고 있는 집"으로 전달된다. */
  focusedUnitId: string | null;
  /** AI가 추천한 주택 id 목록 (지도 마커 구분에 사용) */
  onRecommend: (ids: string[]) => void;
  onSelectUnit: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const counterRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const focusedUnit = focusedUnitId ? housingById(focusedUnitId) : undefined;

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [messages, open, reduceMotion]);

  const send = async (question: string) => {
    const value = question.trim();
    if (!value || streaming) return;
    counterRef.current += 1;
    const id = counterRef.current;
    const userMsg: ChatMessage = { id: `user-${id}`, role: "user", text: value };
    const assistantId = `assistant-${id}`;
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.text }));

    setMessages((current) => [...current, userMsg, { id: assistantId, role: "assistant", text: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, housingId: focusedUnitId ?? undefined }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "응답을 불러오지 못했어요.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        acc += decoder.decode(chunk, { stream: true });
        setMessages((current) => current.map((m) => (m.id === assistantId ? { ...m, text: acc } : m)));
      }
      const { ids } = parseRec(acc);
      if (ids.length > 0) onRecommend(ids);
      if (!acc.trim()) {
        setMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, text: "답변을 만들지 못했어요. 다시 물어봐 주세요." } : m)),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
      setMessages((current) => current.map((m) => (m.id === assistantId ? { ...m, text: `⚠️ ${message}` } : m)));
    } finally {
      setStreaming(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border border-[#7c3aed]/30 bg-surface/95 pl-2 pr-4 text-sm font-bold text-[#6d28d9] shadow-[var(--shadow-card)] backdrop-blur transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        <Mascot pose="wave" className="h-9 w-9 shrink-0" sizes="36px" />
        AI 갈붕에게 물어보기
      </button>
    );
  }

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      aria-label="AI 갈붕 지도 도우미"
      className="pointer-events-auto flex max-h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-[var(--radius-cardlg)] border border-[#7c3aed]/25 bg-surface/97 shadow-[var(--shadow-sheet)] backdrop-blur"
    >
      <header className="flex items-center gap-2 border-b border-border bg-[#f7f3ff] px-3 py-2.5">
        <Mascot pose="wave" className="h-9 w-9 shrink-0" sizes="36px" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-navy">AI 갈붕</h2>
          <p className="truncate text-xs text-muted">
            {focusedUnit ? `${focusedUnit.name} 보는 중` : "마커를 고르면 그 집을 기준으로 답해요"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="AI 갈붕 닫기"
          className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-[#f7f3ff] p-3 text-sm leading-relaxed text-fg">
            <p>
              지도를 보면서 물어보세요. 마커를 선택하면 <b className="font-semibold">그 주택을 기준</b>으로 답하고,
              조건을 말하면 맞는 집을 <b className="font-semibold text-[#6d28d9]">보라색 마커</b>로 표시해 드려요.
            </p>
          </div>
        ) : (
          <ol role="log" aria-live="polite" className="space-y-2.5">
            {messages.map((message) => {
              const assistant = message.role === "assistant";
              const pending = assistant && streaming && message.text === "";
              const { clean, ids } = assistant ? parseRec(message.text) : { clean: message.text, ids: [] };
              return (
                <li key={message.id} className={cn("flex", assistant ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      assistant ? "rounded-tl-md bg-surface-muted text-fg" : "rounded-tr-md bg-primary text-white",
                    )}
                  >
                    {pending ? (
                      <span className="flex gap-1 py-1" aria-label="답변 작성 중">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                      </span>
                    ) : (
                      <>
                        <p>{clean}</p>
                        {ids.length > 0 && (
                          <ul className="mt-2 space-y-1 border-t border-border/70 pt-2">
                            {ids.map((id) => {
                              const unit = housingById(id);
                              if (!unit) return null;
                              return (
                                <li key={id}>
                                  <button
                                    type="button"
                                    onClick={() => onSelectUnit(id)}
                                    className="w-full rounded px-1 py-0.5 text-left text-xs font-semibold text-[#6d28d9] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
                                  >
                                    지도에서 보기 · {unit.name} ({ELIGIBILITY_TYPE_LABEL[unit.type]})
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <AnimatePresence initial={false}>
        {messages.length === 0 && (
          <motion.div
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2"
          >
            {HINTS.map((hint) => (
              <button
                key={hint}
                type="button"
                disabled={streaming}
                onClick={() => send(hint)}
                className="rounded-full bg-[#f3ebff] px-2.5 py-1.5 text-xs font-semibold text-[#6d28d9] transition-colors hover:bg-[#e9dcff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)] disabled:opacity-50"
              >
                {hint}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="border-t border-border p-2">
        <label htmlFor="map-ai-input" className="sr-only">
          AI 갈붕에게 질문
        </label>
        <div className="flex items-end gap-1.5 rounded-[var(--radius-cardlg)] border border-border bg-surface p-1 focus-within:border-[#7c3aed]/50 focus-within:ring-2 focus-within:ring-[#7c3aed]/15">
          <textarea
            id="map-ai-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={300}
            placeholder={focusedUnit ? "이 집에 대해 물어보세요" : "조건을 말해주면 지도에 표시해요"}
            className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            aria-label="질문 보내기"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[#7c3aed] text-white transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 flex items-center gap-1 px-1 text-[11px] text-muted">
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
          AI 답변은 참고용이에요
        </p>
      </form>
    </motion.section>
  );
}
