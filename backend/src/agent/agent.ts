import { prisma } from "../database/prisma.js";
import { getLlm } from "../services/llm/index.js";
import { MockLlmProvider } from "../services/llm/mock-llm.js";
import { toolRegistry, getTool, toolDefinitionsForLlm } from "./tools/index.js";
import type { LlmMessage, LlmTool } from "../services/llm/types.js";

export interface AgentEvent {
  type: "tool_start" | "tool_result" | "card" | "pending_action" | "text" | "error" | "done";
  data: any;
}

export interface RunAgentInput {
  merchantId: string;
  conversationId: string;
  userText: string;
  language: string;
  onEvent: (e: AgentEvent) => void;
}

const SYSTEM_PROMPT = `You are DIA (Do-It Agent), a voice-first autonomous business teammate for a small merchant.
You have access to real business tools backed by the merchant's actual database. Never fabricate numbers, customer counts, campaign results or metrics: only use values returned by tools.

Rules:
- Read-only tools (sales metrics, transactions, segments, analysis, previews, performance) run automatically.
- Write tools that change external state (creating offers, creating segments, generating campaigns, executing campaigns) must be prepared as drafts and require merchant approval before any external side effect. Never claim the merchant approved something unless a tool result confirms it.
- When you recommend an action, explain the evidence briefly. Distinguish evidence from hypotheses.
- Reply in the merchant's preferred language, even if the question is written in another language.
- Keep the spoken reply under 60 words. Detailed numbers belong in cards, not the spoken reply.
- If margin or cost data is missing, label estimates clearly.
- Always end a reply that created a pending approval by asking the merchant to review and approve.

Writing style, because this text is spoken aloud to a shopkeeper:
- Use everyday words. Never say campaign, audience, segment, ledger, demo, tool, model, API, prompt, agent, confidence, or hypothesis.
- Say message instead of campaign, customers instead of audience, profit instead of margin check.
- Never name a tool, a provider, or a model. Never mention that you are an AI.
- Short sentences. No markdown, no bullet lists, no emoji, no headings.
- Write money as "Rs. 5,879".
- When reporting sales, speak about successful or completed orders. Mention failed payments only if the merchant asks about them.
- When you mention a count, a discount, a duration, or a number of days, copy the exact value from the tool result. Never restate a time window the tool did not return, and never round or re-word it.`;


function friendlyError(language: string): string {
  if (language.startsWith("hi")) return "अभी जवाब नहीं बन पाया। थोड़ी देर बाद फिर पूछिए।";
  if (language.startsWith("mr")) return "आत्ता उत्तर तयार होऊ शकले नाही. थोड्या वेळाने पुन्हा विचारा.";
  return "I could not answer that just now. Please try again in a moment.";
}

function approvalSentence(language: string, summary: any): string {
  const audience = Number(summary?.audience ?? 0);
  const cost = Number(summary?.estimatedCost ?? 0);
  const raw = String(summary?.offer ?? "");
  const [kind, value] = raw.split(" ");
  const offer = kind === "PERCENT" ? `${value}% off` : kind === "FLAT" ? `Rs. ${value} off` : raw;
  const tight = summary?.marginOk === false;
  if (language.startsWith("hi")) {
    return `${audience} ग्राहकों के लिए ${offer} का मैसेज तैयार है। इसमें करीब Rs. ${cost.toLocaleString("en-IN")} का खर्च आएगा।${tight ? " ध्यान रखिए, इससे मुनाफ़ा कम रहेगा।" : ""} नीचे देखिए, हाँ कहिए तो भेज दूँ।`;
  }
  if (language.startsWith("mr")) {
    return `${audience} ग्राहकांसाठी ${offer} चा संदेश तयार आहे. यात सुमारे Rs. ${cost.toLocaleString("en-IN")} खर्च येईल.${tight ? " लक्षात ठेवा, यामुळे नफा कमी राहील." : ""} खाली बघा, हो म्हणाल तर पाठवतो.`;
  }
  return `A message with ${offer} is ready for ${audience} customers. It will cost about Rs. ${cost.toLocaleString("en-IN")}.${tight ? " Keep in mind this leaves a thin profit margin." : ""} Check it below, and say yes if you want me to send it.`;
}

export async function runAgent(input: RunAgentInput): Promise<{ assistantMessageId: string; pendingActionIds: string[] }> {
  const { merchantId, conversationId, userText, language, onEvent } = input;

  // persist user message
  const userMsg = await prisma.message.create({
    data: { conversationId, role: "user", content: { text: userText } },
  });

  const llm = getLlm();
  const tools = toolDefinitionsForLlm() as LlmTool[];

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const messages: LlmMessage[] = [{ role: "system", content: SYSTEM_PROMPT + `\nMerchant preferred language: ${language}.` }];
  for (const m of history) {
    const c = m.content as any;
    if (m.role === "user") messages.push({ role: "user", content: c?.text ?? JSON.stringify(c) });
    else if (m.role === "assistant") messages.push({ role: "assistant", content: c?.text ?? null });
    else if (m.role === "tool") messages.push({ role: "tool", content: JSON.stringify(c), name: (c as any)?.tool });
  }
  // ensure the just-added user message is at the end (it is, since we persisted before reading history? history includes it)
  // Remove duplicate trailing if needed: history already includes userMsg, so messages already has userText. Good.

  const pendingActionIds: string[] = [];
  const collectedCards: any[] = [];
  let lastPending: any = null;
  const toolEvents: Array<{ tool: string; status: string; summary: string }> = [];

  const MAX_STEPS = 8;
  let finalText = "";
  let provider = llm.provider;
  let fellBack = false;

  for (let step = 0; step < MAX_STEPS; step++) {
    let response;
    try {
      response = await provider.chat(messages, tools, { temperature: 0.3, maxTokens: 1200 });
    } catch (e: any) {
      // Quota and provider outages should not break a merchant's demo. Before
      // any tool has run, retry the whole turn on the deterministic planner.
      if (!fellBack && step === 0) {
        fellBack = true;
        provider = new MockLlmProvider();
        console.warn("[agent] LLM failed, falling back to the local planner:", e?.message ?? e);
        try {
          response = await provider.chat(messages, tools, { temperature: 0.3, maxTokens: 1200 });
        } catch (e2: any) {
          onEvent({ type: "error", data: { message: e2?.message ?? "LLM error" } });
          finalText = friendlyError(language);
          break;
        }
      } else {
        onEvent({ type: "error", data: { message: e?.message ?? "LLM error" } });
        finalText = friendlyError(language);
        break;
      }
    }

    const msg = response.message;
    if (msg.tool_calls && msg.tool_calls.length) {
      messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });

      for (const tc of msg.tool_calls) {
        const tool = getTool(tc.name);
        onEvent({ type: "tool_start", data: { tool: tc.name } });

        let args: any = {};
        try { args = JSON.parse(tc.arguments || "{}"); } catch { args = {}; }

        const toolRun = await prisma.toolRun.create({
          data: {
            merchantId,
            conversationId,
            messageId: null,
            tool: tc.name,
            args,
            status: "running",
          },
        });

        let result: any;
        if (!tool) {
          result = { ok: false, data: null, summary: `Unknown tool ${tc.name}` };
        } else {
          try {
            result = await tool.handler({ merchantId, conversationId }, args);
          } catch (e: any) {
            result = { ok: false, data: null, summary: `Tool error: ${e?.message ?? e}` };
          }
        }

        await prisma.toolRun.update({
          where: { id: toolRun.id },
          data: {
            status: result.ok ? "completed" : "failed",
            result: result.data ?? null,
            error: result.ok ? null : result.summary,
            finishedAt: new Date(),
          },
        });

        if (result.card) {
          collectedCards.push(result.card);
          onEvent({ type: "card", data: result.card });
        }
        if (result.pendingAction) {
          pendingActionIds.push(result.pendingAction.id);
          lastPending = result.pendingAction;
          onEvent({ type: "pending_action", data: result.pendingAction });
        }
        toolEvents.push({ tool: tc.name, status: result.ok ? "completed" : "failed", summary: result.summary });
        onEvent({ type: "tool_result", data: { tool: tc.name, ok: result.ok, summary: result.summary } });

        messages.push({ role: "tool", content: JSON.stringify({ tool: tc.name, ok: result.ok, summary: result.summary, data: result.data }), tool_call_id: tc.id, name: tc.name });
      }
      // A pending approval is the end of the turn. The model cannot execute it,
      // and a deterministic sentence keeps the spoken numbers exact.
      if (lastPending) {
        finalText = approvalSentence(language, lastPending.summary);
        break;
      }
      continue;
    }

    // final answer
    finalText = msg.content ?? "";
    break;
  }

  if (!finalText) finalText = "I've completed the available steps. Please review the results above.";

  // persist assistant message
  const assistantMsg = await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: { text: finalText, cards: collectedCards, pendingActions: pendingActionIds, toolEvents },
    },
  });

  // link tool runs to message
  await prisma.toolRun.updateMany({ where: { conversationId, messageId: null }, data: { messageId: assistantMsg.id } });

  onEvent({ type: "text", data: { text: finalText } });
  onEvent({ type: "done", data: { messageId: assistantMsg.id, pendingActionIds } });

  return { assistantMessageId: assistantMsg.id, pendingActionIds };
}
