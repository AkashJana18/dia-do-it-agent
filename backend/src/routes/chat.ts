import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";
import { requireMerchant } from "../middleware/auth.js";
import { runAgent } from "../agent/agent.js";

export async function chatRoutes(app: FastifyInstance) {
  app.get("/api/conversations", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const convs = await prisma.conversation.findMany({
      where: { merchantId: mid },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { _count: { select: { messages: true } } },
    });
    return { conversations: convs };
  });

  app.post("/api/conversations", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const body = (request.body ?? {}) as { title?: string };
    const conv = await prisma.conversation.create({ data: { merchantId: mid, title: body.title ?? "New conversation" } });
    return { conversation: conv };
  });

  app.get("/api/conversations/:id/messages", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const { id } = request.params as { id: string };
    const conv = await prisma.conversation.findFirst({ where: { id, merchantId: mid } });
    if (!conv) return reply.code(404).send({ error: "not found" });
    const msgs = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
    return { messages: msgs };
  });

  app.post("/api/chat", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const body = (request.body ?? {}) as { conversationId?: string; text?: string; language?: string };
    const text = (body.text ?? "").trim();
    if (!text) return reply.code(400).send({ error: "text required" });

    let conversationId = body.conversationId;
    if (!conversationId) {
      const conv = await prisma.conversation.create({ data: { merchantId: mid, title: text.slice(0, 60) } });
      conversationId = conv.id;
    } else {
      const conv = await prisma.conversation.findFirst({ where: { id: conversationId, merchantId: mid } });
      if (!conv) return reply.code(404).send({ error: "conversation not found" });
    }

    const prefs = await prisma.merchantPreference.findUnique({ where: { merchantId: mid } });
    const language = body.language ?? prefs?.languageCode ?? "hi-IN";

    // SSE setup
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    const send = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // send conversationId first
    send("meta", { conversationId });

    try {
      await runAgent({
        merchantId: mid,
        conversationId: conversationId!,
        userText: text,
        language,
        onEvent: (e) => send(e.type, e.data),
      });
    } catch (e: any) {
      send("error", { message: e?.message ?? "agent error" });
    } finally {
      send("end", {});
      reply.raw.end();
    }
    // prevent fastify from auto-ending
    return reply;
  });
}
