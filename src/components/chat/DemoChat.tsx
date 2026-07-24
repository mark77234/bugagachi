"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Send, Sparkles, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Mascot } from "@/components/common/Mascot";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DEMO_CHAT_TOPICS,
  FALLBACK_ANSWER,
  demoChatTopicByKey,
  findDemoChatTopic,
  type DemoChatAction,
} from "@/features/chat/demo-chat";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { housingById } from "@/mocks/housing";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: DemoChatAction[];
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "공공임대 유형, 자격 조건, 준비 서류와 신청 절차를 쉬운 말로 안내해 드릴게요. 아래 질문을 선택하거나 궁금한 내용을 입력해 보세요.",
};

function initialMessages(topicKey: string | null, housingId: string | null): ChatMessage[] {
  const messages = [WELCOME_MESSAGE];
  const unit = housingId ? housingById(housingId) : undefined;

  if (unit) {
    messages.push({
      id: `housing-${unit.id}`,
      role: "assistant",
      text: `${unit.name}은 ${ELIGIBILITY_TYPE_LABEL[unit.type]} 유형으로 안내돼요. 이 정보만으로 신청 자격을 판단할 수는 없으며, 자격 확인 후 공식 공고의 대상·서류·일정을 확인해야 해요.`,
      actions: [
        { label: "이 주택을 지도에서 보기", href: `/map?selected=${unit.id}` },
        { label: "내 자격 확인하기", href: "/eligibility" },
      ],
    });
  }

  const topic = demoChatTopicByKey(topicKey);
  if (topic) {
    messages.push(
      { id: `initial-user-${topic.key}`, role: "user", text: topic.question },
      { id: `initial-answer-${topic.key}`, role: "assistant", text: topic.answer, actions: topic.actions },
    );
  }

  return messages;
}

export function DemoChat() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages(params.get("topic"), params.get("housingId")),
  );
  const [input, setInput] = useState("");
  const messageCounter = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [messages, reduceMotion]);

  const sendQuestion = (question: string) => {
    const value = question.trim();
    if (!value) return;
    messageCounter.current += 1;
    const id = messageCounter.current;
    const topic = findDemoChatTopic(value);
    const answer = topic ?? FALLBACK_ANSWER;

    setMessages((current) => [
      ...current,
      { id: `user-${id}`, role: "user", text: value },
      { id: `assistant-${id}`, role: "assistant", text: answer.answer, actions: answer.actions },
    ]);
    setInput("");
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
      <div className="border-b border-border bg-warning-subtle/70 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-warning-subtle ring-1 ring-warning/30">
            <Mascot pose="readDocument" className="h-11 w-11" sizes="44px" objectClassName="object-cover object-top" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-navy">공공임대 안내 도우미</h2>
              <Badge tone="warning">AI 안내</Badge>
            </div>
            <p id="chat-demo-notice" className="mt-1 text-sm text-muted">
              공공임대 관련 기본 질문을 안내해요. 공식 자격 판정 서비스는 아니에요.
            </p>
          </div>
        </div>
      </div>

      <div className="grid h-[calc(100dvh-31rem)] min-h-[270px] grid-rows-[minmax(0,1fr)_auto] sm:h-[min(680px,calc(100dvh-17rem))] sm:min-h-[500px]">
        <div className="overflow-y-auto p-4 sm:p-6">
          <ol role="log" aria-live="polite" aria-relevant="additions" className="space-y-4">
            {messages.map((message) => {
              const assistant = message.role === "assistant";
              return (
                <motion.li
                  key={message.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className={cn("flex gap-2.5", assistant ? "justify-start" : "justify-end")}
                >
                  {assistant && (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-warning-subtle ring-1 ring-warning/20">
                      <Mascot pose="idle" className="h-8 w-8" sizes="32px" objectClassName="object-cover object-top" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[var(--radius-card)] px-4 py-3 text-sm leading-relaxed sm:max-w-[72%]",
                      assistant ? "bg-surface-muted text-fg" : "bg-primary text-white",
                    )}
                  >
                    <p>{message.text}</p>
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <Link
                            key={`${message.id}-${action.href}`}
                            href={action.href}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-surface")}
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>
                    )}
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

          <section aria-labelledby="suggested-questions-title" className="mt-8 border-t border-border pt-5">
            <h3 id="suggested-questions-title" className="flex items-center gap-2 text-sm font-bold text-navy">
              <Sparkles className="h-4 w-4 text-warning" aria-hidden />
              이런 질문을 해보세요
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_CHAT_TOPICS.map((topic) => (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => sendQuestion(topic.question)}
                  className="min-h-11 rounded-[var(--radius-input)] border border-border bg-surface px-4 py-2.5 text-left text-sm font-medium text-fg transition-colors hover:border-warning/40 hover:bg-warning-subtle focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--color-ring)]"
                >
                  {topic.question}
                </button>
              ))}
            </div>
          </section>
        </div>

        <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-border bg-surface p-3 sm:p-4" aria-describedby="chat-demo-notice">
          <label htmlFor="chat-input" className="sr-only">
            공공임대 관련 질문
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              maxLength={300}
              placeholder="예: 신청할 때 어떤 서류가 필요한가요?"
              className="min-h-12 flex-1 resize-none rounded-[var(--radius-input)] border border-border bg-surface px-4 py-3 text-base text-fg placeholder:text-muted focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--color-ring)]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(buttonVariants({ variant: "primary", size: "icon" }), "h-12 w-12 shrink-0")}
              aria-label="질문 보내기"
            >
              <Send className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Enter로 보내기 · Shift+Enter로 줄바꿈</p>
        </form>
      </div>
    </div>
  );
}
