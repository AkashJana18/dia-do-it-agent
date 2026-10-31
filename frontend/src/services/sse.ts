import { apiBase } from "./api";

export interface ChatEvent {
  event: string;
  data: any;
}

export async function streamChat(
  text: string,
  conversationId: string | undefined,
  language: string,
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem("dia_token");
  const res = await fetch(apiBase + "/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, conversationId, language }),
    credentials: "include",
    signal,
  });
  if (!res.ok || !res.body) throw new Error("chat failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = chunk.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) {
        try { onEvent({ event, data: JSON.parse(data) }); } catch { onEvent({ event, data }); }
      }
    }
  }
}
