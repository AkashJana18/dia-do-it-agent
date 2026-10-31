import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";
import { createSessionToken, requireMerchant } from "../middleware/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/demo", async (request, reply) => {
    const body = (request.body ?? {}) as { merchantId?: string };
    let merchantId = body.merchantId;
    if (!merchantId) {
      const m = await prisma.merchant.findFirst({ orderBy: { createdAt: "asc" } });
      if (!m) return reply.code(404).send({ error: "no merchant seeded" });
      merchantId = m.id;
    }
    const token = createSessionToken(merchantId);
    reply.setCookie("dia_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
    });
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    const prefs = await prisma.merchantPreference.findUnique({ where: { merchantId } });
    return { token, merchant, preferences: prefs };
  });

  app.get("/api/auth/me", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const merchant = await prisma.merchant.findUnique({ where: { id: mid } });
    const prefs = await prisma.merchantPreference.findUnique({ where: { merchantId: mid } });
    return { merchant, preferences: prefs };
  });
}
