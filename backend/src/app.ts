import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { config, isAllowedOrigin } from "./config.js";
import { authRoutes } from "./routes/auth.js";
import { chatRoutes } from "./routes/chat.js";
import { voiceRoutes } from "./routes/voice.js";
import { approvalRoutes, actionRoutes } from "./routes/approvals.js";
import { dataRoutes } from "./routes/data.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: config.logLevel } });

  await app.register(cors, {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  });
  await app.register(cookie, { secret: config.sessionSecret });
  await app.register(multipart, { limits: { fileSize: config.maxAudioMb * 1024 * 1024 } });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.get("/api/health", async () => ({ ok: true, service: "dia-backend", time: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(chatRoutes);
  await app.register(voiceRoutes);
  await app.register(approvalRoutes);
  await app.register(actionRoutes);
  await app.register(dataRoutes);

  return app;
}
