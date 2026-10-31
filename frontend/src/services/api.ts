const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:8787";

function token(): string | null {
  return localStorage.getItem("dia_token");
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem("dia_token", t);
  else localStorage.removeItem("dia_token");
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(API + path, { ...opts, headers, credentials: "include" });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const apiBase = API;

export async function uploadAudio(blob: Blob, language?: string): Promise<{ transcript: string; languageCode: string | null; provider: string }> {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  const t = token();
  const headers: Record<string, string> = {};
  if (t) headers["Authorization"] = `Bearer ${t}`;
  if (language) headers["X-Language"] = language;
  const res = await fetch(API + "/api/voice/transcribe", { method: "POST", body: form, headers, credentials: "include" });
  if (!res.ok) throw new Error("transcription failed");
  return res.json();
}

export async function fetchTTS(text: string, languageCode: string, voice?: string): Promise<string> {
  const r = await api<{ audioBase64: string; mimeType: string }>("/api/tts", {
    method: "POST",
    body: JSON.stringify({ text, languageCode, voice }),
  });
  return r.audioBase64;
}
