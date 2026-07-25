"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, MapPin, Send, Sparkles, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Mascot, type MascotPose } from "@/components/common/Mascot";
import { MapPanel } from "@/components/map/MapPanel";
import type { MapMarker } from "@/components/map/MapView";
import { DEMO_CHAT_TOPICS } from "@/features/chat/demo-chat";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { bestCondition, housingById } from "@/mocks/housing";
import { formatManwon } from "@/lib/formatting";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "안녕하세요, AI 갈붕이예요! 🐤 부산 공공임대 유형·자격·서류·신청 절차를 안내하고, 예산과 생활 취향에 맞는 주택도 추천해 드려요. 아래 질문을 눌러보거나 궁금한 점을 편하게 입력해 주세요.",
};

const REC_RE = /<<REC:([^>]*)>>/;

/** 갈붕이가 먼저 보여주는 사용 예시. 누르면 그대로 질문이 전송된다. */
const USAGE_EXAMPLES: { tag: string; prompt: string; hint: string }[] = [
  {
    tag: "예산으로 추천",
    prompt: "신혼부부인데 예산 월 30만원으로 추천해줘",
    hint: "가구 상황 + 예산을 말해주면 맞는 집을 골라드려요",
  },
  {
    tag: "지역으로 추천",
    prompt: "수영구에서 보증금 500만원 이하로 조용한 곳 추천해줘",
    hint: "원하는 구·군과 보증금 한도를 함께 알려주세요",
  },
  {
    tag: "생활권으로 추천",
    prompt: "청년 1인 가구인데 지하철역 가까운 집 알려줘",
    hint: "역세권·마트·공원 같은 생활 조건도 반영해요",
  },
  {
    tag: "자격·서류 문의",
    prompt: "공공임대 신청에 어떤 서류가 필요한가요?",
    hint: "자격 조건과 준비 서류도 쉬운 말로 알려드려요",
  },
];

/** 모델이 `rental-` 접두사를 빼먹어도 실제 주택 id로 맞춰준다. */
function normalizeUnitId(raw: string): string | null {
  const id = raw.trim();
  if (!id) return null;
  if (housingById(id)) return id;
  const prefixed = id.startsWith("rental-") ? null : `rental-${id}`;
  if (prefixed && housingById(prefixed)) return prefixed;
  return null;
}

/** 응답 텍스트에서 추천 마커(<<REC:...>>)를 분리. 스트리밍 중 미완성 마커는 숨긴다. */
function parseRec(text: string): { clean: string; ids: string[] } {
  const match = text.match(REC_RE);
  if (match) {
    const ids = match[1]
      .split(",")
      .map((s) => normalizeUnitId(s))
      .filter((id): id is string => !!id);
    return { clean: text.replace(REC_RE, "").trim(), ids: [...new Set(ids)].slice(0, 3) };
  }
  // 스트리밍 도중 아직 닫히지 않은 마커 조각 숨김
  return { clean: text.replace(/\n?<<?R?E?C?:?[^>]*$/, "").trimEnd(), ids: [] };
}

function initialMessages(housingId: string | null): ChatMessage[] {
  const messages = [WELCOME_MESSAGE];
  const unit = housingId ? housingById(housingId) : undefined;
  if (unit) {
    messages.push({
      id: `housing-${unit.id}`,
      role: "assistant",
      text: `지금 보고 계신 ${unit.name}(${ELIGIBILITY_TYPE_LABEL[unit.type]})에 대해 궁금한 점을 물어보셔도 돼요. 자격·서류·주변 생활권 등 무엇이든요!`,
    });
  }
  return messages;
}

function avatarPose(message: ChatMessage, pending: boolean, hasRec: boolean): MascotPose {
  if (pending) return "thinking";
  if (message.id === "welcome") return "wave";
  if (hasRec) return "present";
  return "readDocument";
}

/** 채팅 안에 보여주는 추천 미니맵 + 주택 리스트 + 지도 라우팅. */
function ChatRecMap({ ids }: { ids: string[] }) {
  const router = useRouter();
  const units = ids.map((id) => housingById(id)).filter((u): u is NonNullable<typeof u> => !!u);
  if (units.length === 0) return null;

  const markers: MapMarker[] = units.map((u) => {
    const c = bestCondition(u);
    return { id: u.id, coord: u.coord, label: u.name, caption: c ? `월 ${formatManwon(c.monthlyRent)}` : "가격 미공개" };
  });

  return (
    <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-primary-subtle px-3 py-2 text-xs font-bold text-primary">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        갈붕 지도 · 추천 {units.length}곳
      </div>
      <div className="h-[240px] w-full">
        <MapPanel
          markers={markers}
          selectedId={null}
          onSelect={(id) => router.push(`/map?selected=${id}`)}
          ariaLabel="추천 주택 갈붕 미니 지도"
          fullBleed
        />
      </div>
      <ul className="divide-y divide-border">
        {units.map((u) => {
          const c = bestCondition(u);
          return (
            <li key={u.id}>
              <Link
                href={`/map?selected=${u.id}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-surface-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">{u.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {u.gungu} · {ELIGIBILITY_TYPE_LABEL[u.type]} · {c ? `월 ${formatManwon(c.monthlyRent)}` : "가격 미공개"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
                  지도 <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={`/map?selected=${units[0].id}`}
        className="flex items-center justify-center gap-1.5 border-t border-border bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
      >
        <MapPin className="h-4 w-4" aria-hidden />
        갈붕 지도에서 보기
      </Link>
    </div>
  );
}

export function DemoChat() {
  const params = useSearchParams();
  const housingId = params.get("housingId");
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages(housingId));
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messageCounter = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [messages, reduceMotion]);

  const sendQuestion = async (question: string) => {
    const value = question.trim();
    if (!value || streaming) return;
    messageCounter.current += 1;
    const id = messageCounter.current;
    const userMsg: ChatMessage = { id: `user-${id}`, role: "user", text: value };
    const assistantId = `assistant-${id}`;
    const historyForApi = [...messages, userMsg].map((m) => ({ role: m.role, content: m.text }));

    setMessages((current) => [...current, userMsg, { id: assistantId, role: "assistant", text: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi, housingId }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        const base = data?.error ?? "응답을 불러오지 못했어요.";
        throw new Error(data?.detail ? `${base} (${data.detail})` : base);
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
      if (!acc.trim()) {
        setMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, text: "답변을 만들지 못했어요. 다시 질문해 주세요." } : m)),
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
    sendQuestion(input);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-[var(--radius-cardlg)] border border-border bg-surface shadow-[var(--shadow-card)]">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary-subtle to-surface p-4 sm:p-5">
        <Mascot pose="wave" float className="h-14 w-14 shrink-0 drop-shadow-[0_3px_6px_rgba(20,32,31,0.18)]" sizes="56px" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-navy">AI 갈붕이</h2>
            <Badge tone="primary">AI 임대주택 추천·챗봇</Badge>
          </div>
          <p id="chat-demo-notice" className="mt-0.5 text-sm text-muted">
            공공임대 안내 + 예산·취향 맞춤 추천을 도와드려요. 최종 자격·공고는 공식 기관에서 확인해요.
          </p>
        </div>
      </div>

      <div className="grid h-[calc(100dvh-30rem)] min-h-[300px] grid-rows-[minmax(0,1fr)_auto] sm:h-[min(700px,calc(100dvh-16rem))] sm:min-h-[520px]">
        <div className="overflow-y-auto bg-bg/40 p-4 sm:p-6">
          <ol role="log" aria-live="polite" aria-relevant="additions" className="space-y-4">
            {messages.map((message) => {
              const assistant = message.role === "assistant";
              const pending = assistant && streaming && message.text === "";
              const { clean, ids } = assistant ? parseRec(message.text) : { clean: message.text, ids: [] };
              return (
                <motion.li
                  key={message.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className={cn("flex gap-2.5", assistant ? "justify-start" : "justify-end")}
                >
                  {assistant && (
                    <Mascot
                      pose={avatarPose(message, pending, ids.length > 0)}
                      className="mt-0.5 h-9 w-9 shrink-0 drop-shadow-[0_1px_3px_rgba(20,32,31,0.18)]"
                      sizes="36px"
                    />
                  )}
                  <div className={cn("min-w-0", assistant ? "max-w-[85%] sm:max-w-[74%]" : "max-w-[85%] sm:max-w-[72%]")}>
                    <div
                      className={cn(
                        "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[var(--shadow-sm)]",
                        assistant ? "rounded-tl-md bg-surface-muted text-fg" : "rounded-tr-md bg-primary text-white",
                      )}
                    >
                      {pending ? (
                        <span className="flex gap-1 py-0.5" aria-label="답변 작성 중">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
                        </span>
                      ) : (
                        <p>{clean}</p>
                      )}
                    </div>
                    {assistant && ids.length > 0 && <ChatRecMap ids={ids} />}
                  </div>
                  {!assistant && (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                      <UserRound className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ol>

          <div ref={endRef} />

          {messages.length <= 2 && (
            <section aria-labelledby="usage-guide-title" className="mt-6 border-t border-border pt-5">
              {/* 갈붕이가 먼저 사용법을 보여준다 */}
              <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] bg-primary-subtle/60 p-3.5">
                <Mascot pose="pointUp" className="h-12 w-12 shrink-0" sizes="48px" />
                <div className="min-w-0">
                  <h3 id="usage-guide-title" className="text-sm font-bold text-navy">
                    이렇게 물어보면 제가 잘 찾아드려요!
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    <b className="font-semibold text-fg">가구 상황</b> + <b className="font-semibold text-fg">예산</b> +{" "}
                    <b className="font-semibold text-fg">원하는 지역·생활권</b>을 함께 말해주면 딱 맞는 집을 추천하고
                    지도로 보여드려요.
                  </p>
                </div>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                아래 예시를 눌러 그대로 따라해 보세요
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {USAGE_EXAMPLES.map((example) => (
                  <button
                    key={example.prompt}
                    type="button"
                    disabled={streaming}
                    onClick={() => sendQuestion(example.prompt)}
                    className="group rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary-subtle/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--color-ring)] disabled:opacity-50"
                  >
                    <span className="inline-flex rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-bold text-primary">
                      {example.tag}
                    </span>
                    <span className="mt-1.5 block text-sm font-semibold text-navy">“{example.prompt}”</span>
                    <span className="mt-1 block text-xs text-muted">{example.hint}</span>
                  </button>
                ))}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">
                  다른 질문도 보기
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {DEMO_CHAT_TOPICS.map((topic) => (
                    <button
                      key={topic.key}
                      type="button"
                      disabled={streaming}
                      onClick={() => sendQuestion(topic.question)}
                      className="min-h-11 rounded-[var(--radius-input)] border border-border bg-surface px-4 py-2.5 text-left text-sm font-medium text-fg transition-colors hover:border-primary/40 hover:bg-primary-subtle focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--color-ring)] disabled:opacity-50"
                    >
                      {topic.question}
                    </button>
                  ))}
                </div>
              </details>
            </section>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 border-t border-border bg-surface p-3 sm:p-4"
          aria-describedby="chat-demo-notice"
        >
          <label htmlFor="chat-input" className="sr-only">
            공공임대 관련 질문
          </label>
          <div className="flex items-end gap-2 rounded-[var(--radius-cardlg)] border border-border bg-surface p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              maxLength={300}
              placeholder="예: 신혼부부인데 예산 월 30만원으로 추천해줘"
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-fg placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-primary text-white transition-opacity hover:bg-primary-hover disabled:opacity-40 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--color-ring)]"
              aria-label="질문 보내기"
            >
              <Send className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Enter로 보내기 · Shift+Enter로 줄바꿈 · AI 답변은 참고용이에요</p>
        </form>
      </div>
    </div>
  );
}
