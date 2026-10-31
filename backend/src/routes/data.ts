import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";
import { requireMerchant } from "../middleware/auth.js";
import * as sales from "../services/analytics/sales.js";
import * as customers from "../services/analytics/customers.js";
import { paytm } from "../integrations/paytm/mock.js";

export async function dataRoutes(app: FastifyInstance) {
  // ---- overview dashboard ----
  app.get("/api/dashboard", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const todaySummary = await sales.salesSummary(mid, today, tomorrow);
    const yestSummary = await sales.salesSummary(mid, yesterday, today);
    const wk = await sales.weekendCompare(mid);
    const segs = await customers.buildSegments(mid);
    const series = await sales.dailySeries(mid, 14);
    const top = await sales.topProducts(mid, new Date(Date.now() - 30 * 86400000), new Date(), 5);

    const activeCampaigns = await prisma.campaign.findMany({
      where: { merchantId: mid, status: { in: ["running", "completed", "approved"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const recentTx = await prisma.transaction.findMany({
      where: { merchantId: mid },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true, product: true },
    });

    return {
      today: todaySummary,
      yesterday: yestSummary,
      weekend: wk,
      segments: segs.map((s) => ({ name: s.name, count: s.count, description: s.description })),
      series,
      topProducts: top,
      activeCampaigns,
      recentTransactions: recentTx,
    };
  });

  // ---- customers ----
  app.get("/api/customers", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const list = await paytm.listCustomers(mid);
    const q = (request.query as any)?.q?.toLowerCase();
    const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q)) : list;
    return { customers: filtered.slice(0, 200), total: filtered.length };
  });

  app.get("/api/customers/segments", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const segs = await customers.buildSegments(mid);
    return { segments: segs.map((s) => ({ name: s.name, description: s.description, criteria: s.criteria, count: s.count })) };
  });

  // ---- products ----
  app.get("/api/products", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const products = await paytm.listProducts(mid);
    return { products };
  });

  // ---- offers ----
  app.get("/api/offers", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const offers = await prisma.offer.findMany({ where: { merchantId: mid }, orderBy: { createdAt: "desc" } });
    return { offers };
  });

  // ---- campaigns ----
  app.get("/api/campaigns", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const campaigns = await prisma.campaign.findMany({ where: { merchantId: mid }, orderBy: { createdAt: "desc" } });
    return { campaigns };
  });

  app.get("/api/campaigns/:id", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const { id } = request.params as { id: string };
    const campaign = await prisma.campaign.findFirst({ where: { id, merchantId: mid }, include: { events: true } });
    if (!campaign) return reply.code(404).send({ error: "not found" });
    return { campaign };
  });

  // ---- analytics ----
  app.get("/api/analytics/sales", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const days = Number((request.query as any)?.days ?? 30);
    const series = await sales.dailySeries(mid, Math.min(90, Math.max(7, days)));
    return { series };
  });

  // ---- preferences ----
  app.get("/api/preferences", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const prefs = await prisma.merchantPreference.findUnique({ where: { merchantId: mid } });
    return { preferences: prefs };
  });

  app.put("/api/preferences", async (request, reply) => {
    const mid = await requireMerchant(request, reply);
    if (!mid) return;
    const body = (request.body ?? {}) as any;
    const prefs = await prisma.merchantPreference.upsert({
      where: { merchantId: mid },
      update: {
        languageCode: body.languageCode ?? undefined,
        ttsVoice: body.ttsVoice ?? undefined,
        ttsModel: body.ttsModel ?? undefined,
        autoPlayTts: body.autoPlayTts ?? undefined,
        theme: body.theme ?? undefined,
      },
      create: {
        merchantId: mid,
        languageCode: body.languageCode ?? "hi-IN",
        ttsVoice: body.ttsVoice ?? "priya",
        ttsModel: body.ttsModel ?? "bulbul:v3",
        autoPlayTts: body.autoPlayTts ?? true,
        theme: body.theme ?? "dark",
      },
    });
    return { preferences: prefs };
  });
}
