import type { LlmMessage, LlmTool, LlmResponse, LlmProvider } from "./types.js";
import { config } from "../../config.js";

interface OpenAICompatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  reasoningEffort?: string;
}

export class OpenAICompatProvider implements LlmProvider {
  name = "openai-compat";
  private cfg: OpenAICompatConfig;
  private model: string;

  constructor(cfg: OpenAICompatConfig) {
    this.cfg = cfg;
    this.model = cfg.model;
  }

  async chat(messages: LlmMessage[], tools: LlmTool[], opts?: { temperature?: number; maxTokens?: number }): Promise<LlmResponse> {
    const url = this.cfg.baseUrl.replace(/\/$/, "") + "/chat/completions";
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => {
        const out: Record<string, unknown> = { role: m.role };
        if (m.content !== undefined) out.content = m.content;
        if (m.tool_calls) out.tool_calls = m.tool_calls.map((tc) => {
          const call: Record<string, unknown> = {
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: tc.arguments },
          };
          if (tc.extraContent) call.extra_content = tc.extraContent;
          return call;
        });
        if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
        if (m.name) out.name = m.name;
        return out;
      }),
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 1200,
    };
    if (tools.length) body.tools = tools;
    body.tool_choice = tools.length ? "auto" : undefined;
    if (this.cfg.reasoningEffort) body.reasoning_effort = this.cfg.reasoningEffort;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
        ...(this.cfg.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      choices: Array<{
        message: {
          role: string;
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
            extra_content?: Record<string, unknown>;
          }>;
        };
        finish_reason: string;
      }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const choice = data.choices[0]!;
    const msg = choice.message;
    const toolCalls = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
      extraContent: tc.extra_content,
    }));
    return {
      message: {
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: toolCalls.length ? toolCalls : undefined,
      },
      finishReason: choice.finish_reason,
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export function buildLlmProvider(): { provider: LlmProvider; model: string } | null {
  const { provider, apiKey, model, baseUrl } = config.llm;
  if (provider === "mock" || !apiKey) return null;

  let base = baseUrl;
  let m = model;
  const headers: Record<string, string> = {};
  if (provider === "gemini") {
    base = base || "https://generativelanguage.googleapis.com/v1beta/openai";
    m = m || "gemini-3.1-flash-lite";
  } else if (provider === "groq") {
    base = base || "https://api.groq.com/openai/v1";
    m = m || "openai/gpt-oss-120b";
  } else if (provider === "openrouter") {
    base = base || "https://openrouter.ai/api/v1";
    m = m || "google/gemma-4-31b-it:free";
    headers["HTTP-Referer"] = "https://dia.local";
    headers["X-Title"] = "DIA Do-It Agent";
  } else if (provider === "openai") {
    base = base || "https://api.openai.com/v1";
    m = m || "gpt-4o-mini";
  } else if (provider === "custom") {
    if (!base) return null;
  } else {
    return null;
  }
  return {
    provider: new OpenAICompatProvider({
      baseUrl: base,
      apiKey,
      model: m,
      extraHeaders: headers,
      reasoningEffort: provider === "gemini" ? config.llm.reasoningEffort : undefined,
    }),
    model: m,
  };
}
