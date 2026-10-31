import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

function loadEnvFile(path: string) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // file may not exist; ignore
  }
}

loadEnvFile(resolve(ROOT, ".env"));
loadEnvFile(resolve(ROOT, "backend", ".env"));
loadEnvFile(resolve(process.cwd(), ".env"));

export const ROOT_DIR = ROOT;

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function intEnv(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: intEnv("PORT", 8787),
  logLevel: env("LOG_LEVEL", "info"),
  sessionSecret: env("SESSION_SECRET", "dev-secret-change-me"),
  frontendOrigin: env("FRONTEND_ORIGIN", "http://localhost:5173"),
  databaseUrl: (() => {
    const raw = env("DATABASE_URL", "");
    if (!raw) return "file:" + resolve(ROOT, "prisma", "dev.db");
    if (raw.startsWith("file:")) {
      const p = raw.slice(5);
      if (p && !p.startsWith("/")) return "file:" + resolve(ROOT, "prisma", p);
    }
    return raw;
  })(),
  maxAudioMb: intEnv("MAX_AUDIO_MB", 10),
  maxAudioSeconds: intEnv("MAX_AUDIO_SECONDS", 30),
  llm: {
    provider: env("LLM_PROVIDER", "gemini").toLowerCase(),
    apiKey: env("LLM_API_KEY", ""),
    model: env("LLM_MODEL", "gemini-2.5-flash"),
    baseUrl: env("LLM_BASE_URL", ""),
  },
  sarvam: {
    apiKey: env("SARVAM_API_KEY", ""),
    baseUrl: env("SARVAM_BASE_URL", "https://api.sarvam.ai"),
    sttModel: env("SARVAM_STT_MODEL", "saaras:v4"),
    ttsModel: env("SARVAM_TTS_MODEL", "bulbul:v3"),
    ttsSpeaker: env("SARVAM_TTS_SPEAKER", "shubh"),
    translateModel: env("SARVAM_TRANSLATE_MODEL", "mayura:v1"),
  },
  n8n: {
    webhookBaseUrl: env("N8N_WEBHOOK_BASE_URL", ""),
  },
} as const;
