import { sarvamConfigured, sarvamFetch, sarvamModelDefaults } from "./sarvam-client.js";

export interface TtsResult {
  audioBase64: string;
  mimeType: string;
  provider: "sarvam" | "mock";
}

const cache = new Map<string, TtsResult>();
const CACHE_MAX = 120;

function cacheKey(text: string, lang: string, voice: string, model: string) {
  return `${model}|${voice}|${lang}|${text}`;
}

// Generate a tiny valid WAV containing a short sine tone (mock fallback).
function mockWavBase64(text: string): string {
  const sampleRate = 22050;
  const dur = Math.min(1.2, Math.max(0.4, text.length / 40));
  const numSamples = Math.floor(sampleRate * dur);
  const buf = Buffer.alloc(44 + numSamples * 2);
  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + numSamples * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const env = Math.min(1, i / (sampleRate * 0.05)) * Math.min(1, (numSamples - i) / (sampleRate * 0.05));
    const v = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 0.25 * env;
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf.toString("base64");
}

export async function textToSpeech(text: string, languageCode: string, voice?: string): Promise<TtsResult> {
  const models = sarvamModelDefaults();
  const model = models.tts;
  const speaker = voice || models.ttsSpeaker;
  const key = cacheKey(text, languageCode, speaker, model);
  const cached = cache.get(key);
  if (cached) return cached;

  let result: TtsResult;
  if (!sarvamConfigured()) {
    result = { audioBase64: mockWavBase64(text), mimeType: "audio/wav", provider: "mock" };
  } else {
    const res = await sarvamFetch("/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.slice(0, 2400),
        language_code: languageCode,
        speaker,
        model,
        pace: 1.0,
        speech_sample_rate: 22050,
        output_audio_codec: "wav",
        temperature: 0.6,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sarvam TTS ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { audios: string[] };
    result = { audioBase64: json.audios?.[0] ?? "", mimeType: "audio/wav", provider: "sarvam" };
  }

  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, result);
  return result;
}
