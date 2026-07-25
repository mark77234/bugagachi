import OpenAI from "openai";
import { MOCK_HOUSING, bestCondition, housingById } from "@/mocks/housing";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { formatManwon } from "@/lib/formatting";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

type ChatRole = "user" | "assistant";
interface IncomingMessage {
  role: ChatRole;
  content: string;
}

/** 주택 데이터셋을 토큰 효율적으로 요약해 모델 컨텍스트로 제공. */
function buildHousingContext(): string {
  const lines = MOCK_HOUSING.map((unit) => {
    const c = bestCondition(unit);
    const price = c ? `보증금 ${formatManwon(c.deposit)}/월 ${formatManwon(c.monthlyRent)}` : "임대조건 미공개";
    const area = unit.exclusiveAreas[0] ? `전용 ${unit.exclusiveAreas[0]}㎡~` : "";
    return `- [${unit.id}] ${unit.name} · ${unit.gungu} · ${ELIGIBILITY_TYPE_LABEL[unit.type]} · ${price} · ${unit.supplyCount}세대 ${area}`.trim();
  });
  return lines.join("\n");
}

function systemPrompt(housingId?: string): string {
  const focus = housingId ? housingById(housingId) : undefined;
  const focusBlock = focus
    ? `\n\n[사용자가 현재 보고 있는 주택]\n${focus.name} (${focus.gungu}, ${ELIGIBILITY_TYPE_LABEL[focus.type]}) · id=${focus.id}\n주소: ${focus.address}`
    : "";

  return `당신은 "AI 갈붕이"입니다. 부산 공공임대주택을 추천하고 안내하는 친근한 AI 도우미예요.
말투는 따뜻하고 명확한 존댓말(~해요체)을 쓰고, 답변은 핵심 위주로 간결하게 3~6문장 또는 짧은 목록으로 정리하세요.

역할:
1) 공공임대 유형·자격 조건·준비 서류·신청 절차를 쉬운 말로 안내
2) 아래 부산 공공임대 데이터에서 사용자 상황(예산·지역·가구·선호)에 맞는 주택을 2~3곳 추천하고 이유를 설명

반드시 지킬 규칙:
- 추천/안내는 참고용이며, 최종 신청 자격과 모집 일정은 공식 모집공고에서 확인해야 한다고 안내하세요.
- 아래 목록에 없는 주택을 지어내지 마세요. 추천할 때는 주택 이름과 지역, 대략적인 임대료를 함께 제시하세요.
- 법적 자격 확정처럼 단정하지 말고, 가능성/참고 관점으로 안내하세요.
- 금액은 "만원" 단위로 말하세요.
- 개인정보(주민번호 등)를 묻거나 저장하지 마세요.
- 특정 주택을 추천했다면, 답변의 맨 마지막 줄에 반드시 아래 형식으로 추천한 주택의 id를 최대 3개까지 적으세요. 이 줄은 사용자에게 지도로 보여주는 용도입니다.
  형식(정확히 이대로, 다른 말 붙이지 말 것): <<REC:id1,id2,id3>>
  id는 위 목록의 대괄호 안에 있는 값을 **글자 하나도 바꾸지 않고 그대로** 적으세요. 반드시 "rental-"로 시작하는 전체 id를 쓰고, 접두사를 빼거나 줄이지 마세요.
  추천이 아니라 일반 안내만 했다면 이 줄을 넣지 마세요.

[부산 공공임대 주택 목록 (${MOCK_HOUSING.length}개 건물)]
${buildHousingContext()}${focusBlock}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI 설정이 완료되지 않았어요. 관리자에게 문의해 주세요." }, { status: 503 });
  }

  let body: { messages?: IncomingMessage[]; housingId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12); // 최근 대화만 유지

  if (history.length === 0) {
    return Response.json({ error: "메시지가 비어 있어요." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      temperature: 0.4,
      max_tokens: 700,
      messages: [{ role: "system", content: systemPrompt(body.housingId) }, ...history],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content;
            if (token) controller.enqueue(encoder.encode(token));
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n(응답 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.)"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // OpenAI 호출 실패 원인을 로그와 응답에 남긴다 (키 값 등 비밀은 포함하지 않음).
    const err = error as { status?: number; code?: string; type?: string; message?: string };
    const detail = [err?.status && `status=${err.status}`, err?.code && `code=${err.code}`, err?.type && `type=${err.type}`]
      .filter(Boolean)
      .join(" ");
    console.error("[api/chat] OpenAI 호출 실패", {
      status: err?.status,
      code: err?.code,
      type: err?.type,
      message: err?.message,
      model: MODEL,
      keyLength: apiKey.length,
    });

    // 원인별 사용자 안내
    let message = "AI 응답을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
    if (err?.status === 401) message = "AI 인증에 실패했어요. 서버의 API 키 설정을 확인해 주세요.";
    else if (err?.status === 429) {
      message =
        err?.code === "insufficient_quota"
          ? "AI 사용 한도(크레딧)가 부족해요. 결제·사용량 설정을 확인해 주세요."
          : "요청이 많아 잠시 대기가 필요해요. 잠시 후 다시 시도해 주세요.";
    } else if (err?.status === 404) message = "설정된 AI 모델을 사용할 수 없어요. 모델 이름을 확인해 주세요.";

    return Response.json({ error: message, detail: detail || undefined }, { status: 502 });
  }
}
