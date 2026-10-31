import { prisma } from "../database/prisma.js";
import { getLlm } from "../services/llm/index.js";
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
- When you recommend an action, explain the evidence and the confidence level. Distinguish evidence from hypotheses.
- Keep the spoken reply short (under 60 words) and in the merchant's language. Detailed numbers belong in cards, not the spoken reply.
- If margin or cost data is missing, label estimates clearly.
- Always end a reply that created a pending approval by asking the merchant to review and approve.
`;

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
  const toolEvents: Array<{ tool: string; status: string; summary: string }> = [];

  const MAX_STEPS = 8;
  let finalText = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    let response;
    try {
      response = await llm.provider.chat(messages, tools, { temperature: 0.3, maxTokens: 1200 });
    } catch (e: any) {
      onEvent({ type: "error", data: { message: e?.message ?? "LLM error" } });
      finalText = "I hit an error reaching the language model. Please try again.";
      break;
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
          onEvent({ type: "pending_action", data: result.pendingAction });
        }
        toolEvents.push({ tool: tc.name, status: result.ok ? "completed" : "failed", summary: result.summary });
        onEvent({ type: "tool_result", data: { tool: tc.name, ok: result.ok, summary: result.summary } });

        messages.push({ role: "tool", content: JSON.stringify({ tool: tc.name, ok: result.ok, summary: result.summary, data: result.data }), tool_call_id: tc.id, name: tc.name });
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
