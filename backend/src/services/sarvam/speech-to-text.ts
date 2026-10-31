import { sarvamConfigured, sarvamFetch, sarvamModelDefaults } from "./sarvam-client.js";

export interface SttResult {
  transcript: string;
  languageCode: string | null;
  provider: "sarvam" | "mock";
}

export async function speechToText(audio: Buffer, filename: string, languageCode?: string): Promise<SttResult> {
  if (!sarvamConfigured()) {
    // mock: a fixed Hinglish demo utterance so the flow stays demonstrable
    return {
      transcript: "Last weekend sales kam ho gayi hain. Check karo kya problem hai aur inactive customers ko wapas lane ke liye ek offer banao.",
      languageCode: "hi-IN",
      provider: "mock",
    };
  }
  const form = new FormData();
  const blob = new Blob([new Uint8Array(audio)], { type: "audio/webm" });
  form.append("file", blob, filename || "audio.webm");
  const models = sarvamModelDefaults();
  form.append("model", models.stt);
  if (languageCode && languageCode !== "unknown") form.append("language_code", languageCode);
  else form.append("language_code", "unknown");
  // mode only for saaras:v3; v4 ignores. send transcribe implicitly (default).

  const res = await sarvamFetch("/speech-to-text", { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sarvam STT ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { transcript: string; language_code: string | null };
  return { transcript: json.transcript, languageCode: json.language_code, provider: "sarvam" };
}
