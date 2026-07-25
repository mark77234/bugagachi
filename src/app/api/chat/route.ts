import OpenAI from "openai";
import { MOCK_HOUSING, bestCondition, housingById } from "@/mocks/housing";
import { ELIGIBILITY_TYPE_LABEL } from "@/features/eligibility/eligibility.types";
import { formatManwon } from "@/lib/formatting";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * AI 제공자 설정.
 *
 * 기본값은 Upstage(Solar)이고, OpenAI 호환 API라 같은 SDK를 그대로 쓴다.
 * 환경변수만 바꾸면 재배포 없이 제공자·모델을 교체할 수 있다.
 *
 *   AI_API_KEY   호출 키 (미설정 시 UPSTAGE_API_KEY → OPENAI_API_KEY 순으로 찾는다)
 *   AI_BASE_URL  OpenAI 호환 엔드포인트 (OpenAI 로 되돌리려면 https://api.openai.com/v1)
 *   AI_MODEL     모델 이름 (예: solar-pro2, gpt-4o-mini)
 */
const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.upstage.ai/v1";
const AI_MODEL = process.env.AI_MODEL ?? process.env.OPENAI_MODEL ?? "solar-pro2";
const AI_API_KEY = process.env.AI_API_KEY ?? process.env.UPSTAGE_API_KEY ?? process.env.OPENAI_API_KEY;

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

[이 서비스(부가가치) 사용법 — "어떻게 사용하나요", "뭘 할 수 있나요" 같은 질문이 오면 이 내용을 바탕으로 안내하세요]
- 부가가치는 부산 공공임대주택을 "① 신청 자격 확인 → ② 생활 취향 추천" 두 단계로 찾아주는 서비스예요. 로그인 없이 쓸 수 있고, 입력한 내용은 사용자 브라우저에만 저장돼요.
- 1단계 '자격 확인'(/eligibility): 주택 소유 여부 → 생년월일·세대구성원 → 소득·자산 → 부산 거주 여부를 답하면, 통합공공임대·행복주택·재개발임대·매입임대(일반/청년) 5개 유형 중 신청 가능성이 있는 유형을 알려줘요.
- 2단계 '생활 취향 설정'(/preferences): 예산(보증금·월세)과 희망 지역을 정하면 조건 밖 주택은 제외하고, 자주 가는 곳·기반시설·돌봄교육·취향 가게·동네 분위기를 반영해 추천 순서를 매겨요. 원하지 않는 질문은 건너뛸 수 있어요.
- '추천 결과'에서는 주택마다 왜 추천했는지 근거(거리·시설 수 등)를 함께 보여주고, 지도로도 볼 수 있어요.
- '지도'(/map)에서는 자격 확인 없이도 부산 공공임대주택을 마커로 둘러볼 수 있어요.
- 주택 상세 페이지에서는 임대조건(보증금·월세), 입주자격, 주택 사양, 건물 정보, 주변 생활환경, 신청 체크리스트를 확인할 수 있어요.
- 여기 대화창에서는 가구 상황·예산·원하는 지역이나 생활 조건을 말해주면 바로 맞는 집을 골라 지도와 함께 보여드려요. 자격이나 서류가 궁금할 때도 물어보면 돼요.
- 사용법을 설명할 때는 단계를 짧은 목록으로 정리하고, 마지막에 "지금 바로 예산이나 원하는 지역을 말해주시면 골라드릴게요" 같은 다음 행동을 한 줄로 제안하세요.

[부산 공공임대 주택 목록 (${MOCK_HOUSING.length}개 건물)]
${buildHousingContext()}${focusBlock}`;
}

export async function POST(req: Request) {
  const apiKey = AI_API_KEY;
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

  const client = new OpenAI({ apiKey, baseURL: AI_BASE_URL });

  try {
    const stream = await client.chat.completions.create({
      model: AI_MODEL,
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
    // 호출 실패 원인을 로그와 응답에 남긴다 (키 값 등 비밀은 포함하지 않음).
    const err = error as { status?: number; code?: string; type?: string; message?: string };
    const detail = [err?.status && `status=${err.status}`, err?.code && `code=${err.code}`, err?.type && `type=${err.type}`]
      .filter(Boolean)
      .join(" ");
    console.error("[api/chat] AI 호출 실패", {
      status: err?.status,
      code: err?.code,
      type: err?.type,
      message: err?.message,
      baseUrl: AI_BASE_URL,
      model: AI_MODEL,
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
