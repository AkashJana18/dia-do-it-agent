import type { FastifyInstance } from "fastify";
import { requireMerchant } from "../middleware/auth.js";
import { speechToText } from "../services/sarvam/speech-to-text.js";
import { textToSpeech } from "../services/sarvam/text-to-speech.js";

export async function voiceRoutes(app: FastifyInstance) {
  app.post("/api/voice/transcribe", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const file = await (request as any).file();
    if (!file) return reply.code(400).send({ error: "audio file required" });
    const chunks: Buffer[] = [];
    for await (const c of file.file) chunks.push(c as Buffer);
    const audio = Buffer.concat(chunks);
    const maxBytes = 10 * 1024 * 1024;
    if (audio.length > maxBytes) return reply.code(413).send({ error: "audio too large" });
    const lang = (file.fields?.language_code?.value as string) || (request.headers["x-language"] as string) || undefined;
    try {
      const result = await speechToText(audio, file.filename || "audio.webm", lang);
      return result;
    } catch (e: any) {
      return reply.code(502).send({ error: e?.message ?? "stt failed" });
    }
  });

  app.post("/api/tts", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const body = (request.body ?? {}) as { text?: string; languageCode?: string; voice?: string };
    const text = (body.text ?? "").trim();
    if (!text) return reply.code(400).send({ error: "text required" });
    const lang = body.languageCode ?? "en-IN";
    try {
      const result = await textToSpeech(text, lang, body.voice);
      return result;
    } catch (e: any) {
      return reply.code(502).send({ error: e?.message ?? "tts failed" });
    }
  });
}
