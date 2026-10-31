export type LlmRole = "system" | "user" | "assistant" | "tool";

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
}

export interface LlmMessage {
  role: LlmRole;
  content?: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface LlmTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlmResponse {
  message: LlmMessage;
  finishReason: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LlmProvider {
  name: string;
  chat(messages: LlmMessage[], tools: LlmTool[], opts?: { temperature?: number; maxTokens?: number }): Promise<LlmResponse>;
}
