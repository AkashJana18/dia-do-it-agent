import { config } from "../../config.js";

export function sarvamConfigured(): boolean {
  return Boolean(config.sarvam.apiKey);
}

export async function sarvamFetch(path: string, init: RequestInit): Promise<Response> {
  const url = config.sarvam.baseUrl.replace(/\/$/, "") + path;
  const headers = new Headers(init.headers);
  headers.set("api-subscription-key", config.sarvam.apiKey);
  return fetch(url, { ...init, headers });
}

export function sarvamModelDefaults() {
  return {
    stt: config.sarvam.sttModel,
    tts: config.sarvam.ttsModel,
    ttsSpeaker: config.sarvam.ttsSpeaker,
    translate: config.sarvam.translateModel,
  };
}
