import { prisma } from "../../database/prisma.js";
import { paytm } from "../../integrations/paytm/mock.js";
import * as sales from "../../services/analytics/sales.js";
import * as customers from "../../services/analytics/customers.js";
import { getLlm } from "../../services/llm/index.js";
import { z } from "zod";

export interface ToolResult {
  ok: boolean;
  data: any;
  card?: any;
  pendingAction?: any;
  summary: string;
}

export interface ToolContext {
  merchantId: string;
  conversationId?: string;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk: "read" | "write";
  handler: (ctx: ToolContext, args: any) => Promise<ToolResult>;
}

const tools: ToolDef[] = [];

function register(t: ToolDef) { tools.push(t); }

// Resolve the exact audience for a segment. The old code snapped every request
// to a prebuilt 30/60/90 bucket, which made a "30 days" segment and its offer
// disagree. Derive the list from the criteria instead.
async function audienceForSegment(merchantId: string, segment: { criteria?: unknown } | null) {
  const days = Number((segment?.criteria as any)?.inactiveDays);
  if (!Number.isFinite(days)) {
    const segs = await customers.buildSegments(merchantId);
    return segs.find((s) => s.name.startsWith("Inactive"))!.customers;
  }
  const all = await paytm.listCustomers(merchantId);
  const cutoff = Date.now() - days * 86400000;
  return all.filter((c) => !c.lastPurchaseAt || c.lastPurchaseAt.getTime() < cutoff);
}

// ---------- 1. get_sales_metrics ----------
register({
  name: "get_sales_metrics",
  description: "Fetch daily/weekly/monthly sales for the merchant and compare against the prior period. Returns revenue, order count, average ticket, unique customers.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      period: { type: "string", enum: ["today", "yesterday", "week", "month"], description: "Period to summarize." },
      compare: { type: "boolean", description: "Compare against the prior period." },
    },
    required: ["period"],
  },
  handler: async (ctx, args) => {
    const period = args.period ?? "today";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let from = new Date(now);
    let to = new Date(now);
    to.setHours(23, 59, 59, 999);
    if (period === "today") { /* from today 0 */ }
    else if (period === "yesterday") { from.setDate(from.getDate() - 1); to = new Date(from); to.setHours(23, 59, 59, 999); }
    else if (period === "week") { from.setDate(from.getDate() - 7); }
    else if (period === "month") { from.setDate(from.getDate() - 30); }

    const summary = await sales.salesSummary(ctx.merchantId, from, to);
    const wk = await sales.weekendCompare(ctx.merchantId);

    const data: any = {
      period,
      today: period === "today" ? summary : undefined,
      yesterday: period === "yesterday" ? summary : undefined,
      week: period === "week" ? summary : undefined,
      month: period === "month" ? summary : undefined,
      summary,
      weekend: wk,
      revenueDeltaPct: wk.revenueDeltaPct,
      lastWeekendRevenue: wk.lastWeekend.revenue,
      prevWeekendRevenue: wk.prevWeekend.revenue,
    };

    const card = {
      type: "insight",
      title: `${period.charAt(0).toUpperCase() + period.slice(1)} sales`,
      metrics: [
        { label: "Revenue", value: `Rs. ${summary.revenue.toLocaleString("en-IN")}` },
        { label: "Orders", value: summary.successfulOrders },
        { label: "Avg ticket", value: `Rs. ${summary.avgTicket.toLocaleString("en-IN")}` },
        { label: "Unique customers", value: summary.uniqueCustomers },
      ],
      body: `Weekend revenue ${wk.revenueDeltaPct >= 0 ? "+" : ""}${wk.revenueDeltaPct}% vs previous weekend.`,
    };

    return { ok: true, data, card, summary: `Retrieved ${period} sales: Rs. ${summary.revenue.toLocaleString("en-IN")} across ${summary.successfulOrders} orders.` };
  },
});

// ---------- 2. get_transaction_history ----------
register({
  name: "get_transaction_history",
  description: "Retrieve transaction records, optionally filtered by date range, status and limit.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: "ISO date (inclusive)." },
      to: { type: "string", description: "ISO date (inclusive)." },
      status: { type: "string", enum: ["SUCCESS", "FAILED", "PENDING"] },
      limit: { type: "number" },
    },
  },
  handler: async (ctx, args) => {
    const from = args.from ? new Date(args.from) : undefined;
    const to = args.to ? new Date(args.to) : undefined;
    const rows = await paytm.listTransactions(ctx.merchantId, { from, to, status: args.status, limit: args.limit ?? 50 });
    const data = { count: rows.length, transactions: rows.slice(0, 20) };
    return { ok: true, data, summary: `Retrieved ${rows.length} transactions.` };
  },
});

// ---------- 3. get_customer_segments ----------
register({
  name: "get_customer_segments",
  description: "Compute customer segments (active, dormant, inactive 60+, lost, frequent, high value) with counts.",
  risk: "read",
  parameters: { type: "object", properties: {} },
  handler: async (ctx) => {
    const segs = await customers.buildSegments(ctx.merchantId);
    const data = {
      segments: segs.map((s) => ({ name: s.name, description: s.description, criteria: s.criteria, count: s.count })),
      active: segs.find((s) => s.name.startsWith("Active"))?.count ?? 0,
      dormant: segs.find((s) => s.name.startsWith("Dormant"))?.count ?? 0,
      inactive60: segs.find((s) => s.name.startsWith("Inactive"))?.count ?? 0,
      lost: segs.find((s) => s.name.startsWith("Lost"))?.count ?? 0,
      frequent: segs.find((s) => s.name.startsWith("Frequent"))?.count ?? 0,
      highValue: segs.find((s) => s.name.startsWith("High value"))?.count ?? 0,
    };
    const card = {
      type: "segment",
      title: "Customer segments",
      segments: data.segments,
    };
    return { ok: true, data, card, summary: `Computed ${segs.length} segments; ${data.inactive60} customers inactive 60+ days.` };
  },
});

// ---------- 4. analyze_sales_performance ----------
register({
  name: "analyze_sales_performance",
  description: "Analyze sales trends, compare periods, identify evidence-backed contributing factors and hypotheses with confidence levels.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      focus: { type: "string", enum: ["today", "yesterday", "weekend", "week"] },
      includeHypotheses: { type: "boolean" },
    },
    required: ["focus"],
  },
  handler: async (ctx, args) => {
    const focus = args.focus ?? "today";
    const wk = await sales.weekendCompare(ctx.merchantId);
    const yv = await sales.yesterdayVsTrailing(ctx.merchantId);
    const top = await sales.topProducts(ctx.merchantId, new Date(Date.now() - 14 * 86400000), new Date(), 5);

    const evidence: string[] = [];
    const hypotheses: string[] = [];

    if (focus === "weekend" || focus === "yesterday") {
      evidence.push(`Last weekend revenue ${wk.revenueDeltaPct >= 0 ? "+" : ""}${wk.revenueDeltaPct}% vs previous weekend.`);
      evidence.push(`Order count ${wk.ordersDeltaPct >= 0 ? "+" : ""}${wk.ordersDeltaPct}%; average ticket ${wk.avgTicketDeltaPct >= 0 ? "+" : ""}${wk.avgTicketDeltaPct}%.`);
      if (wk.avgTicketDeltaPct < -5 && wk.ordersDeltaPct > -10) {
        hypotheses.push("Average transaction value fell while visit volume held up, consistent with fewer high-ticket purchases (TV/AC) rather than fewer visitors.");
      }
      if (wk.revenueDeltaPct < -10) {
        hypotheses.push("Weekend decline is large enough to be a demand issue, not just noise; check whether a competitor ran a promo or stock was short.");
      }
    }
    if (focus === "today" || focus === "yesterday") {
      evidence.push(`Yesterday revenue ${yv.revenueDeltaPct >= 0 ? "+" : ""}${yv.revenueDeltaPct}% vs trailing 7-day average.`);
      if (yv.revenueDeltaPct < -10) hypotheses.push("Yesterday was below the recent baseline; could be a low-traffic day or a missing high-ticket sale.");
    }
    evidence.push(`Top products by revenue (14d): ${top.map((p) => p.name).join(", ")}.`);

    const headline =
      wk.revenueDeltaPct < -10
        ? "Weekend sales declined meaningfully; evidence points to fewer high-ticket purchases, not fewer visitors."
        : "Sales are broadly stable; no strong decline signal in the recent window.";

    const card = {
      type: "insight",
      title: "Sales performance analysis",
      metrics: [
        { label: "Weekend revenue delta", value: `${wk.revenueDeltaPct >= 0 ? "+" : ""}${wk.revenueDeltaPct}%` },
        { label: "Order count delta", value: `${wk.ordersDeltaPct >= 0 ? "+" : ""}${wk.ordersDeltaPct}%` },
        { label: "Avg ticket delta", value: `${wk.avgTicketDeltaPct >= 0 ? "+" : ""}${wk.avgTicketDeltaPct}%` },
        { label: "Yesterday vs 7d avg", value: `${yv.revenueDeltaPct >= 0 ? "+" : ""}${yv.revenueDeltaPct}%` },
      ],
      body: headline,
      evidence,
      hypotheses: args.includeHypotheses ? hypotheses : [],
      confidence: wk.revenueDeltaPct < -10 ? "medium" : "low",
    };

    const data = { focus, weekend: wk, yesterdayVsTrailing: yv, topProducts: top, evidence, hypotheses, headline, confidence: card.confidence };
    return { ok: true, data, card, summary: `Analyzed ${focus} performance: ${headline}` };
  },
});

// ---------- 5. create_offer ----------
register({
  name: "create_offer",
  description: "Prepare a discount/promotional offer, compute estimated financial impact and check margin constraints. Created as a draft; publishing is gated by campaign approval.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["PERCENT", "FLAT", "BOGO", "CASHBACK"] },
      value: { type: "number" },
      minAmount: { type: "number" },
      validityDays: { type: "number" },
      title: { type: "string" },
    },
    required: ["type", "value"],
  },
  handler: async (ctx, args) => {
    const type = args.type ?? "PERCENT";
    const value = Number(args.value ?? 10);
    const minAmount = Number(args.minAmount ?? 0);
    const validityDays = Number(args.validityDays ?? 14);
    const title = args.title ?? `${type === "PERCENT" ? value + "% off" : "Rs. " + value + " off"} comeback offer`;

    const products = await paytm.listProducts(ctx.merchantId);
    const avgMargin = products.reduce((s, p) => s + (p.price - p.costPrice) / p.price, 0) / Math.max(1, products.length);
    // margin check: a X% discount must leave positive margin on the average product
    const discountFraction = type === "PERCENT" ? value / 100 : 0;
    const marginOk = avgMargin - discountFraction > 0.03;

    const validFrom = new Date();
    const validTo = new Date();
    validTo.setDate(validTo.getDate() + validityDays);

    const latestSegment = await prisma.customerSegment.findFirst({
      where: { merchantId: ctx.merchantId },
      orderBy: { createdAt: "desc" },
    });
    const audience = await audienceForSegment(ctx.merchantId, latestSegment);
    const avgSpend = audience.reduce((s, c) => s + c.totalSpend, 0) / Math.max(1, audience.length);
    const estRedeemed = Math.round(audience.length * 0.22);
    const estRevenue = Math.round(estRedeemed * Math.max(500, avgSpend * 0.4));
    const estDiscountCost = type === "PERCENT"
      ? Math.round(estRevenue * (value / 100))
      : value * estRedeemed;

    const offer = await prisma.offer.create({
      data: {
        merchantId: ctx.merchantId,
        name: title,
        type,
        value,
        minAmount: minAmount || null,
        maxDiscount: type === "PERCENT" ? null : null,
        validFrom,
        validTo,
        estimatedCost: estDiscountCost,
        marginOk,
        status: "draft",
      },
    });

    const card = {
      type: "offer",
      title,
      offer: { id: offer.id, type, value, minAmount, validityDays: Math.round((offer.validTo.getTime() - offer.validFrom.getTime()) / 86400000), validFrom, validTo },
      estimatedCost: estDiscountCost,
      estimatedRevenue: estRevenue,
      estimatedRedemptions: estRedeemed,
      audienceSize: audience.length,
      marginOk,
      avgMarginPct: Math.round(avgMargin * 1000) / 10,
      assumptions: "Assumes ~22% redemption among the inactive cohort and an average redeemed bill at 40% of the cohort's lifetime average spend.",
    };

    return {
      ok: true,
      data: { offerId: offer.id, ...card },
      card,
      summary: `Prepared offer "${title}" (${type} ${value}) for ${audience.length} inactive customers. Margin check: ${marginOk ? "ok" : "tight"}.`,
    };
  },
});

// ---------- 6. create_customer_segment ----------
register({
  name: "create_customer_segment",
  description: "Create a target customer group from defined criteria and persist it. Preparation is automatic; the segment becomes visible immediately.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      criteria: { type: "object" },
    },
    required: ["name", "criteria"],
  },
  handler: async (ctx, args) => {
    const name = args.name ?? "Custom segment";
    const description = args.description ?? "Customer segment created by DIA.";
    const criteria = args.criteria ?? {};
    const inactiveDays = (criteria as any).inactiveDays ?? 60;
    const matched = await audienceForSegment(ctx.merchantId, { criteria });
    const id = await customers.persistSegment(ctx.merchantId, name, description, criteria, matched);
    const card = {
      type: "segment",
      title: name,
      segment: { id, name, description, criteria, customerCount: matched.length },
    };
    return {
      ok: true,
      data: { segmentId: id, name, description, criteria, customerCount: matched.length },
      card,
      summary: `Created segment "${name}" with ${matched.length} customers (no purchase in the last ${inactiveDays} days).`,
    };
  },
});

// ---------- 7. generate_campaign ----------
register({
  name: "generate_campaign",
  description: "Generate a localized campaign (message + audience + offer) and create a pending approval to execute it. Never executes without approval.",
  risk: "write",
  parameters: {
    type: "object",
    properties: {
      segmentId: { type: "string" },
      offerId: { type: "string" },
      language: { type: "string", description: "BCP-47 language code, e.g. hi-IN, mr-IN." },
      channel: { type: "string", enum: ["WHATSAPP", "SMS", "PUSH"] },
    },
    required: ["segmentId", "offerId", "language"],
  },
  handler: async (ctx, args) => {
    const language = args.language ?? "hi-IN";
    const channel = args.channel ?? "WHATSAPP";

    // resolve segment
    let segment = null;
    if (args.segmentId && args.segmentId !== "latest") {
      segment = await prisma.customerSegment.findFirst({ where: { id: args.segmentId, merchantId: ctx.merchantId } });
    }
    if (!segment) {
      segment = await prisma.customerSegment.findFirst({ where: { merchantId: ctx.merchantId }, orderBy: { createdAt: "desc" } });
    }
    // resolve offer
    let offer = null;
    if (args.offerId && args.offerId !== "latest") {
      offer = await prisma.offer.findFirst({ where: { id: args.offerId, merchantId: ctx.merchantId } });
    }
    if (!offer) {
      offer = await prisma.offer.findFirst({ where: { merchantId: ctx.merchantId, status: "draft" }, orderBy: { createdAt: "desc" } });
    }

    const audience = await audienceForSegment(ctx.merchantId, segment);

    // Write the customer-facing message in the merchant's language first, so a
    // translated sentence never lands half-English in a customer's inbox.
    const merchant = await prisma.merchant.findUnique({ where: { id: ctx.merchantId } });
    const shopName = merchant?.name ?? "our shop";
    const validityDays = offer ? Math.round((offer.validTo.getTime() - offer.validFrom.getTime()) / 86400000) : 14;
    const saving = offer?.type === "PERCENT" ? `${offer.value}%` : `Rs. ${offer?.value}`;
    const baseMessage = `Come back to ${shopName}! Get ${saving} off your next purchase. Valid for ${validityDays} days. Show this message at the store.`;
    const localMessages: Record<string, string> = {
      "hi-IN": `${shopName} में आपका फिर से स्वागत है! अगली खरीद पर ${saving} की छूट. ${validityDays} दिन तक मान्य. दुकान पर यह मैसेज दिखाइए.`,
      "mr-IN": `${shopName} मध्ये पुन्हा स्वागत आहे! पुढील खरेदीवर ${saving} सूट. ${validityDays} दिवसांसाठी वैध. दुकानात हा संदेश दाखवा.`,
      "en-IN": baseMessage,
    };
    let finalMessage = localMessages[language] ?? baseMessage;
    if (!localMessages[language]) {
      try {
        const { translateText } = await import("../../services/sarvam/translate.js");
        finalMessage = await translateText(baseMessage, "en-IN", language);
      } catch {
        finalMessage = baseMessage;
      }
    }

    const campaignName =
      language.startsWith("hi") ? "वापसी का मैसेज" : language.startsWith("mr") ? "परत बोलवण्याचा संदेश" : "Comeback message";
    const actionTitle =
      language.startsWith("hi")
        ? `${audience.length} ग्राहकों को मैसेज भेजें`
        : language.startsWith("mr")
        ? `${audience.length} ग्राहकांना संदेश पाठवा`
        : `Send a message to ${audience.length} customers`;
    const plainWhat =
      language.startsWith("hi")
        ? `${audience.length} ग्राहकों को WhatsApp पर मैसेज`
        : language.startsWith("mr")
        ? `${audience.length} ग्राहकांना WhatsApp वर संदेश`
        : `A WhatsApp message to ${audience.length} customers`;
    const inactiveDays = Number((segment?.criteria as any)?.inactiveDays ?? 60);
    const plainWhy =
      language.startsWith("hi")
        ? `ये ग्राहक ${inactiveDays} दिन से नहीं आए, इसलिए उन्हें वापस बुलाने का मैसेज.`
        : language.startsWith("mr")
        ? `हे ग्राहक ${inactiveDays} दिवसांपासून आले नाहीत, म्हणून त्यांना परत बोलवण्याचा संदेश.`
        : `These customers have not visited in ${inactiveDays} days, so this message brings them back.`;

    const campaign = await prisma.campaign.create({
      data: {
        merchantId: ctx.merchantId,
        name: campaignName,
        offerId: offer?.id ?? null,
        segmentId: segment?.id ?? null,
        message: finalMessage,
        language,
        channel,
        status: "draft",
        audienceCount: audience.length,
      },
    });

    // create approval action
    const action = await prisma.agentAction.create({
      data: {
        merchantId: ctx.merchantId,
        conversationId: ctx.conversationId ?? null,
        type: "EXECUTE_CAMPAIGN",
        title: actionTitle,
        description: `${plainWhat} (${language}, ${channel}).`,
        params: { campaignId: campaign.id, offerId: offer?.id, segmentId: segment?.id, language, channel },
        risk: "write",
        status: "pending_approval",
      },
    });
    const approval = await prisma.approval.create({
      data: {
        merchantId: ctx.merchantId,
        actionId: action.id,
        summary: {
          what: plainWhat,
          why: plainWhy,
          audience: audience.length,
          offer: offer ? `${offer.type} ${offer.value}` : "none",
          message: finalMessage,
          language,
          estimatedCost: offer?.estimatedCost ?? 0,
          marginOk: offer?.marginOk ?? true,
        },
        status: "pending",
      },
    });

    const card = {
      type: "approval",
      actionId: action.id,
      approvalId: approval.id,
      title: action.title,
      what: plainWhat,
      why: plainWhy,
      audience: audience.length,
      offer: offer ? `${offer.type} ${offer.value}` : "none",
      estimatedCost: offer?.estimatedCost ?? 0,
      marginOk: offer?.marginOk ?? true,
      message: finalMessage,
      language,
    };
    const previewCard = {
      type: "campaign_preview",
      campaignId: campaign.id,
      name: campaign.name,
      audience: audience.length,
      message: finalMessage,
      language,
      channel,
      offer: offer ? `${offer.type} ${offer.value}` : "none",
      status: "draft",
    };

    return {
      ok: true,
      data: { campaignId: campaign.id, actionId: action.id, approvalId: approval.id, audience: audience.length, message: finalMessage, language },
      card: previewCard,
      pendingAction: { id: action.id, type: "EXECUTE_CAMPAIGN", title: action.title, summary: card },
      summary: `Prepared a message for ${audience.length} customers; waiting for your yes.`,
    };
  },
});

// ---------- 8. preview_campaign ----------
register({
  name: "preview_campaign",
  description: "Display a previously created campaign preview with audience, message and offer details.",
  risk: "read",
  parameters: {
    type: "object",
    properties: { campaignId: { type: "string" } },
    required: ["campaignId"],
  },
  handler: async (ctx, args) => {
    const campaign = await prisma.campaign.findFirst({ where: { id: args.campaignId, merchantId: ctx.merchantId } });
    if (!campaign) return { ok: false, data: null, summary: "Campaign not found." };
    const card = {
      type: "campaign_preview",
      campaignId: campaign.id,
      name: campaign.name,
      audience: campaign.audienceCount,
      message: campaign.message,
      language: campaign.language,
      channel: campaign.channel,
      status: campaign.status,
    };
    return { ok: true, data: campaign, card, summary: `Previewed campaign "${campaign.name}".` };
  },
});

// ---------- 9. execute_campaign ----------
register({
  name: "execute_campaign",
  description: "Execute an approved campaign through the merchant integration. Requires server-side approval; will refuse otherwise.",
  risk: "write",
  parameters: {
    type: "object",
    properties: { actionId: { type: "string" } },
    required: ["actionId"],
  },
  handler: async (ctx, args) => {
    const action = await prisma.agentAction.findFirst({ where: { id: args.actionId, merchantId: ctx.merchantId } });
    if (!action) return { ok: false, data: null, summary: "Action not found." };
    if (action.status !== "approved") {
      return { ok: false, data: { status: action.status }, summary: `Cannot execute: action status is ${action.status}, not approved.` };
    }
    const params = action.params as any;
    const campaign = await prisma.campaign.findFirst({ where: { id: params.campaignId, merchantId: ctx.merchantId } });
    if (!campaign) return { ok: false, data: null, summary: "Campaign not found." };

    await prisma.agentAction.update({ where: { id: action.id }, data: { status: "executing" } });

    const audience = await paytm.listCustomers(ctx.merchantId);
    const inactive = audience.filter((c) => !c.lastPurchaseAt || Date.now() - (c.lastPurchaseAt?.getTime() ?? 0) > 60 * 86400000);
    const targetAudience = inactive.length ? inactive : audience.slice(0, campaign.audienceCount);

    const result = await paytm.sendCampaign({
      campaignId: campaign.id,
      merchantId: ctx.merchantId,
      audience: targetAudience.slice(0, campaign.audienceCount || targetAudience.length),
      message: campaign.message,
      language: campaign.language,
      channel: campaign.channel,
    });

    // persist events
    await prisma.campaignEvent.createMany({
      data: result.events.map((e) => ({ campaignId: campaign.id, customerId: e.customerId, type: e.type, createdAt: e.at })),
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "completed",
        sentCount: result.sent,
        deliveredCount: result.delivered,
        openedCount: result.opened,
        redeemedCount: result.redeemed,
        revenueAttributed: result.revenueAttributed,
        executedAt: result.executedAt,
        executionResult: result as any,
      },
    });

    // activate offer if present
    if (campaign.offerId) {
      await prisma.offer.updateMany({ where: { id: campaign.offerId, merchantId: ctx.merchantId }, data: { status: "active" } });
    }

    await prisma.agentAction.update({
      where: { id: action.id },
      data: { status: "completed", result: result as any, decidedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { merchantId: ctx.merchantId, actionId: action.id, event: "campaign_executed", data: { campaignId: campaign.id, ...result } as any },
    });

    const card = {
      type: "campaign_result",
      campaignId: campaign.id,
      receipt: `#${campaign.id.slice(-6).toUpperCase()}`,
      name: campaign.name,
      sent: result.sent,
      delivered: result.delivered,
      opened: result.opened,
      redeemed: result.redeemed,
      revenueAttributed: result.revenueAttributed,
      provider: result.provider,
    };
    return {
      ok: true,
      data: result,
      card,
      summary: `Executed campaign "${campaign.name}": sent ${result.sent}, delivered ${result.delivered}, opened ${result.opened}, redeemed ${result.redeemed}, revenue Rs. ${result.revenueAttributed.toLocaleString("en-IN")}.`,
    };
  },
});

// ---------- 10. get_campaign_performance ----------
register({
  name: "get_campaign_performance",
  description: "Track a campaign's delivery, engagement, redemption and attributed revenue.",
  risk: "read",
  parameters: {
    type: "object",
    properties: { campaignId: { type: "string", description: "'latest' or a campaign id." } },
    required: ["campaignId"],
  },
  handler: async (ctx, args) => {
    let campaign = null;
    if (args.campaignId && args.campaignId !== "latest") {
      campaign = await prisma.campaign.findFirst({ where: { id: args.campaignId, merchantId: ctx.merchantId } });
    } else {
      campaign = await prisma.campaign.findFirst({ where: { merchantId: ctx.merchantId }, orderBy: { createdAt: "desc" } });
    }
    if (!campaign) return { ok: false, data: null, summary: "No campaigns found." };
    const data = {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      audience: campaign.audienceCount,
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      opened: campaign.openedCount,
      redeemed: campaign.redeemedCount,
      revenue: campaign.revenueAttributed,
      language: campaign.language,
      executedAt: campaign.executedAt,
    };
    const card = { type: "campaign_result", ...data };
    return { ok: true, data, card, summary: `${campaign.name}: sent ${campaign.sentCount}, delivered ${campaign.deliveredCount}, opened ${campaign.openedCount}, redeemed ${campaign.redeemedCount}, revenue Rs. ${campaign.revenueAttributed.toLocaleString("en-IN")}.` };
  },
});

export const toolRegistry: ToolDef[] = tools;

export function getTool(name: string): ToolDef | undefined {
  return tools.find((t) => t.name === name);
}

export function toolDefinitionsForLlm(): any[] {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}
